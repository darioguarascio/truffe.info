#!/usr/bin/env python3
"""Import a JotForm CSV export (+ local attachment folder) into the reports table."""

from __future__ import annotations

import csv
import json
import os
import re
import subprocess
import sys
import uuid
from datetime import datetime
from pathlib import Path

MIME = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
}


def load_env(env_path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not env_path.exists():
        return env
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        env[key] = value
    return env


def parse_bool_it(value: str | None) -> bool | None:
    if not value:
        return None
    v = value.strip().lower()
    if v in ('si', 'sì', 's', 'yes', 'true', '1'):
        return True
    if v in ('no', 'n', 'false', '0'):
        return False
    return None


def parse_gender(value: str | None) -> str | None:
    if not value:
        return None
    v = value.strip().lower()
    if v in ('uomo', 'male', 'm'):
        return 'male'
    if v in ('donna', 'female', 'f'):
        return 'female'
    return None


def parse_submission_date(value: str) -> str:
    value = value.strip()
    months = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    }
    m = re.match(r'([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})', value)
    if m:
        month = months.get(m.group(1).lower())
        if month:
            return f"{m.group(3)}-{month:02d}-{int(m.group(2)):02d} 12:00:00+00"
    for fmt in ('%d/%m/%Y', '%Y-%m-%d'):
        try:
            return datetime.strptime(value, fmt).strftime('%Y-%m-%d %H:%M:%S+00')
        except ValueError:
            continue
    return datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S+00')


def parse_event_block(text: str) -> list[dict]:
    text = text.strip()
    if not text:
        return []

    match = re.match(
        r'Data:\s*([^,]+),\s*Ora:\s*([^,]+),\s*Descrizione:\s*(.+)',
        text,
        re.DOTALL | re.IGNORECASE,
    )
    if match:
        raw_date, raw_time, description = match.groups()
        date = raw_date.strip()
        dm = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', date)
        if dm:
            d, m, y = dm.groups()
            date = f'{y}-{m.zfill(2)}-{d.zfill(2)}'
        return [{
            'date': date,
            'time': raw_time.strip()[:5],
            'description': description.strip(),
        }]

    return [{'date': '', 'time': '', 'description': text}]


def split_name(full: str) -> tuple[str, str]:
    parts = full.strip().split(None, 1)
    if len(parts) == 1:
        return parts[0], '-'
    return parts[0], parts[1]


def find_attachment_dir(base: Path) -> Path | None:
    for path in base.rglob('uploads_*'):
        if path.is_dir():
            return path
    return None


def copy_to_docker_uploads(src: Path, container: str) -> dict:
    ext = src.suffix.lower()
    stored = f'{uuid.uuid4()}{ext}'
    dest = f'{container}:/app/uploads/{stored}'
    subprocess.run(['docker', 'cp', str(src), dest], check=True)
    return {
        'filename': stored,
        'originalName': src.name,
        'mimeType': MIME.get(ext, 'application/octet-stream'),
        'size': src.stat().st_size,
    }


def psql_insert(env: dict[str, str], row: dict) -> int:
    host = env['POSTGRES_HOST']
    port = env.get('POSTGRES_PORT', '5432')
    user = env['POSTGRES_USER']
    password = env['POSTGRES_PASSWORD']
    db = env.get('POSTGRES_DB', 'truffe')

    amount_sql = 'NULL' if row['amount'] is None else str(row['amount'])

    sql = f"""
INSERT INTO reports (
  created_at, location, amount, money_taken, reported_to_police,
  events, attachments,
  scammer_codename, scammer_gender, scammer_nationality,
  scammer_name, scammer_phone, scammer_characteristics,
  reporter_first_name, reporter_last_name, reporter_email,
  declaration_accepted, terms_accepted, guidelines_accepted,
  status, moderation_notes
) VALUES (
  {esc(row['created_at'])},
  {esc(row['location'])},
  {amount_sql},
  {esc_bool(row['money_taken'])},
  {esc_bool(row['reported_to_police'])},
  {esc(json.dumps(row['events'], ensure_ascii=False))}::jsonb,
  {esc(json.dumps(row['attachments'], ensure_ascii=False))}::jsonb,
  {esc(row['scammer_codename'])},
  {esc(row['scammer_gender'])},
  {esc(row['scammer_nationality'])},
  {esc(row['scammer_name'])},
  {esc(row['scammer_phone'])},
  {esc(row['scammer_characteristics'])},
  {esc(row['reporter_first_name'])},
  {esc(row['reporter_last_name'])},
  {esc(row['reporter_email'])},
  true, true, true,
  {esc(row['status'])},
  {esc(row['moderation_notes'])}
) RETURNING id;
"""

    env_vars = {**os.environ, 'PGPASSWORD': password}
    result = subprocess.run(
        ['psql', '-h', host, '-p', port, '-U', user, '-d', db, '-t', '-A', '-c', sql],
        env=env_vars,
        capture_output=True,
        text=True,
        check=True,
    )
    return int(result.stdout.strip().splitlines()[0])


def esc(value: str | None) -> str:
    if value is None:
        return 'NULL'
    return "'" + str(value).replace("'", "''") + "'"


def esc_bool(value: bool | None) -> str:
    if value is None:
        return 'NULL'
    return 'true' if value else 'false'


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'imported' / 'Modulo_segnalazione_truffa2026-07-01_02_48_29.csv'
    import_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else root / 'imported'
    env_path = Path(sys.argv[3]) if len(sys.argv) > 3 else Path('/home/truffe-info/.env')
    docker_container = os.environ.get('DOCKER_APP_CONTAINER', 'truffe.app')
    status = os.environ.get('IMPORT_STATUS', 'pending')

    env = load_env(env_path)
    for key in ('POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD'):
        if key not in env:
            print(f'Missing {key} in {env_path}', file=sys.stderr)
            return 1

    with csv_path.open(newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))

    if not rows:
        print('No rows in CSV', file=sys.stderr)
        return 1

    if len(rows) > 1:
        print(f'Warning: CSV has {len(rows)} rows; importing only the first', file=sys.stderr)

    row = rows[0]
    first_name, last_name = split_name(row.get('I tuoi dati ', '') or row.get('I tuoi dati', '') or '')
    email = (row.get('Email') or '').strip()

    attach_dir = find_attachment_dir(import_dir)
    attachments: list[dict] = []
    if attach_dir:
        for file_path in sorted(attach_dir.iterdir()):
            if file_path.is_file():
                attachments.append(copy_to_docker_uploads(file_path, docker_container))
                print(f'Uploaded attachment: {file_path.name} -> {attachments[-1]["filename"]}')

    amount_raw = (row.get('Importo della truffa') or '').strip()
    amount = float(amount_raw) if amount_raw else None

    report = {
        'created_at': parse_submission_date(row.get('Submission Date', '')),
        'location': (row.get('Dove è avvenuta la truffa') or '').strip() or None,
        'amount': amount,
        'money_taken': parse_bool_it(row.get('Il truffatore è riuscito a sottrarti il denaro?')),
        'reported_to_police': parse_bool_it(row.get('Hai sporto denuncia alle autorità?')),
        'events': parse_event_block(row.get('Descrizione della truffa', '') or ''),
        'attachments': attachments,
        'scammer_codename': (row.get('Nome in codice del truffatore') or '').strip() or None,
        'scammer_gender': parse_gender(row.get('Sesso')),
        'scammer_nationality': (row.get('Nazionalità') or '').strip() or None,
        'scammer_name': (row.get('Nome') or '').strip() or None,
        'scammer_phone': str(row.get('Numero di telefono') or '').strip() or None,
        'scammer_characteristics': (row.get('Caratteristiche e segni particolari') or '').strip() or None,
        'reporter_first_name': first_name,
        'reporter_last_name': last_name,
        'reporter_email': email,
        'status': status,
        'moderation_notes': 'Imported from legacy JotForm export',
    }

    report_id = psql_insert(env, report)
    print(f'Imported report id={report_id} for {email}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
