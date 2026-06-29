#!/usr/bin/env bash
set -euo pipefail

LEGACY_CONTAINER="${LEGACY_CONTAINER:-scammers.postgresql}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_PATH="${DEPLOY_PATH:-/home/truffe-info}"

if [[ -f "$DEPLOY_PATH/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$DEPLOY_PATH/.env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" && -n "${POSTGRES_HOST:-}" ]]; then
  export PGPASSWORD="${POSTGRES_PASSWORD}"
  TARGET_ARGS=(-h "$POSTGRES_HOST" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -d "${POSTGRES_DB:-truffe}")
else
  TARGET_ARGS=("$DATABASE_URL")
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$LEGACY_CONTAINER"; then
  echo "Legacy container $LEGACY_CONTAINER is not running" >&2
  exit 1
fi

echo "Checking for existing legacy imports..."
ALREADY_IMPORTED="$(psql "${TARGET_ARGS[@]}" -t -A -c \
  "SELECT COUNT(*) FROM reports WHERE moderation_notes LIKE 'Imported from legacy events #%';")"

if [[ "$ALREADY_IMPORTED" != "0" ]]; then
  echo "Legacy events already imported ($ALREADY_IMPORTED rows). Skipping."
  psql "${TARGET_ARGS[@]}" -c \
    "SELECT id, status, created_at, reporter_first_name, location, jsonb_array_length(events) AS event_count, moderation_notes FROM reports ORDER BY id;"
  exit 0
fi

echo "Exporting legacy events from $LEGACY_CONTAINER ..."
EXPORT_FILE="$(mktemp)"
docker exec -i "$LEGACY_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -t -A -f - > "$EXPORT_FILE" <<'SQL'
SELECT format(
  $fmt$
INSERT INTO reports (
  created_at, status, location, amount, money_taken, reported_to_police,
  events, attachments,
  scammer_codename, scammer_gender, scammer_nationality, scammer_name, scammer_phone, scammer_characteristics,
  reporter_first_name, reporter_last_name, reporter_email,
  declaration_accepted, terms_accepted, guidelines_accepted, moderation_notes
) VALUES (
  %L, %L, %L, %s, %s, %s,
  %L::jsonb, '[]'::jsonb,
  %L, %L, %L, NULL, %L, %L,
  %L, %L, %L,
  TRUE, TRUE, TRUE, %L
);
%s
$fmt$,
  e.date_created,
  CASE e.status WHEN 'published' THEN 'approved' ELSE 'pending' END,
  NULLIF(e.victim_location, ''),
  COALESCE(e.amount::text, 'NULL'),
  CASE WHEN e.successful IS NULL THEN 'NULL' WHEN e.successful THEN 'TRUE' ELSE 'FALSE' END,
  CASE WHEN e.reported_to_police IS NULL THEN 'NULL' WHEN e.reported_to_police THEN 'TRUE' ELSE 'FALSE' END,
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'date', to_char((elem->>'time')::timestamptz, 'YYYY-MM-DD'),
          'time', to_char((elem->>'time')::timestamptz, 'HH24:MI'),
          'description', elem->>'description'
        ) ORDER BY elem->>'time'
      )::text
      FROM json_array_elements(COALESCE(e.timeline, '[]'::json)) elem
    ),
    '[]'
  ),
  NULLIF(e.scammer, ''),
  CASE UPPER(COALESCE(s.sex, ''))
    WHEN 'M' THEN 'male'
    WHEN 'MALE' THEN 'male'
    WHEN 'F' THEN 'female'
    WHEN 'FEMALE' THEN 'female'
    ELSE NULL
  END,
  NULLIF(s.nationality, ''),
  COALESCE(NULLIF(e.scammer_phone, ''), NULLIF(split_part(s.phone_numbers, ',', 1), '')),
  CASE WHEN s.kw_data IS NOT NULL THEN s.kw_data::text ELSE NULL END,
  COALESCE(NULLIF(split_part(e.victim_name, ' ', 1), ''), 'Sconosciuto'),
  COALESCE(NULLIF(split_part(e.victim_name, ' ', 2), ''), '—'),
  COALESCE(NULLIF(e.victim_email, ''), format('legacy+event%s@truffe.info', e.id)),
  format('Imported from legacy events #%s (Directus)', e.id),
  CASE WHEN e.status = 'published' THEN format(
    $sub$
INSERT INTO moderation_log (entity_type, reference_id, action, notes, operator)
VALUES ('story', lastval(), 'approved', %L, 'legacy-import');
$sub$,
    format('Imported from legacy events #%s', e.id)
  ) ELSE '' END
)
FROM events e
LEFT JOIN scammers s ON s.codename = e.scammer
ORDER BY e.id;
SQL

echo "Importing into target database ..."
psql "${TARGET_ARGS[@]}" -v ON_ERROR_STOP=1 -f "$EXPORT_FILE"
rm -f "$EXPORT_FILE"

echo "Done. Imported rows:"
psql "${TARGET_ARGS[@]}" -c \
  "SELECT id, status, created_at, reporter_first_name, location, jsonb_array_length(events) AS event_count, moderation_notes FROM reports ORDER BY id;"
