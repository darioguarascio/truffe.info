import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL non configurato');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const sql = await fs.readFile(path.join(process.cwd(), 'db', 'init.sql'), 'utf-8');

try {
  await pool.query(sql);
  console.log('Migrazione completata.');
} catch (err) {
  console.error('Errore migrazione:', err);
  process.exit(1);
} finally {
  await pool.end();
}
