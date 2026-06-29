import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not configured');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const sql = await fs.readFile(path.join(process.cwd(), 'db', 'init.sql'), 'utf-8');

try {
  await pool.query(sql);
  console.log('Migration completed.');
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
} finally {
  await pool.end();
}
