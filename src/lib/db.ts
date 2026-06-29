import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL non configurato');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export interface TimelineEvent {
  data: string;
  ora: string;
  descrizione: string;
}

export interface FileAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface SegnalazioneInput {
  luogo?: string;
  importo?: number;
  denaro_sottratto?: boolean;
  denuncia_polizia?: boolean;
  eventi: TimelineEvent[];
  allegati: FileAttachment[];
  truffatore_codename?: string;
  truffatore_sesso?: 'uomo' | 'donna';
  truffatore_nazionalita?: string;
  truffatore_nome?: string;
  truffatore_telefono?: string;
  truffatore_caratteristiche?: string;
  vittima_nome: string;
  vittima_cognome: string;
  vittima_email: string;
  dichiarazione_accettata: boolean;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  accept_language?: string;
  forwarded_for?: string;
}

export async function insertSegnalazione(data: SegnalazioneInput): Promise<number> {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO segnalazioni (
      luogo, importo, denaro_sottratto, denuncia_polizia,
      eventi, allegati,
      truffatore_codename, truffatore_sesso, truffatore_nazionalita,
      truffatore_nome, truffatore_telefono, truffatore_caratteristiche,
      vittima_nome, vittima_cognome, vittima_email,
      dichiarazione_accettata,
      ip_address, user_agent, referer, accept_language, forwarded_for
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
    ) RETURNING id`,
    [
      data.luogo ?? null,
      data.importo ?? null,
      data.denaro_sottratto ?? null,
      data.denuncia_polizia ?? null,
      JSON.stringify(data.eventi),
      JSON.stringify(data.allegati),
      data.truffatore_codename ?? null,
      data.truffatore_sesso ?? null,
      data.truffatore_nazionalita ?? null,
      data.truffatore_nome ?? null,
      data.truffatore_telefono ?? null,
      data.truffatore_caratteristiche ?? null,
      data.vittima_nome,
      data.vittima_cognome,
      data.vittima_email,
      data.dichiarazione_accettata,
      data.ip_address ?? null,
      data.user_agent ?? null,
      data.referer ?? null,
      data.accept_language ?? null,
      data.forwarded_for ?? null,
    ]
  );
  return result.rows[0].id;
}

export async function runMigrations(): Promise<void> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const sql = await fs.readFile(
    path.join(process.cwd(), 'db', 'init.sql'),
    'utf-8'
  );
  await getPool().query(sql);
}
