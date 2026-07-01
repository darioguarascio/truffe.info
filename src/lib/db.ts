import pg from 'pg';
import type {
  VictimAgeRange,
  VictimGender,
  VictimRole,
  ContactChannel,
  ScamType,
} from './victim-stats';
import { parseEvents, parseAttachments, formatAuthorLabel, type PublicExperience } from './experiences';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export type ReportStatus = 'pending' | 'approved' | 'rejected' | 'removed';
export type ContentReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export interface TimelineEvent {
  date: string;
  time: string;
  description: string;
}

export interface FileAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface ReportInput {
  location?: string;
  amount?: number;
  money_taken?: boolean;
  reported_to_police?: boolean;
  events: TimelineEvent[];
  attachments: FileAttachment[];
  scammer_codename?: string;
  scammer_gender?: 'male' | 'female';
  scammer_nationality?: string;
  scammer_name?: string;
  scammer_phone?: string;
  scammer_characteristics?: string;
  reporter_first_name: string;
  reporter_last_name: string;
  reporter_email: string;
  victim_age_range?: VictimAgeRange;
  victim_gender?: VictimGender;
  victim_region?: string;
  victim_role?: VictimRole;
  contact_channel?: ContactChannel;
  scam_type?: ScamType;
  prior_scam_contact?: boolean;
  declaration_accepted: boolean;
  terms_accepted: boolean;
  guidelines_accepted: boolean;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  accept_language?: string;
  forwarded_for?: string;
}

export interface ReportRow {
  id: number;
  status: ReportStatus;
  reporter_email: string;
  location: string | null;
}

export async function insertReport(data: ReportInput): Promise<number> {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO reports (
      location, amount, money_taken, reported_to_police,
      events, attachments,
      scammer_codename, scammer_gender, scammer_nationality,
      scammer_name, scammer_phone, scammer_characteristics,
      reporter_first_name, reporter_last_name, reporter_email,
      victim_age_range, victim_gender, victim_region, victim_role,
      contact_channel, scam_type, prior_scam_contact,
      declaration_accepted, terms_accepted, guidelines_accepted,
      status,
      ip_address, user_agent, referer, accept_language, forwarded_for
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
      'pending',
      $26, $27, $28, $29, $30
    ) RETURNING id`,
    [
      data.location ?? null,
      data.amount ?? null,
      data.money_taken ?? null,
      data.reported_to_police ?? null,
      JSON.stringify(data.events),
      JSON.stringify(data.attachments),
      data.scammer_codename ?? null,
      data.scammer_gender ?? null,
      data.scammer_nationality ?? null,
      data.scammer_name ?? null,
      data.scammer_phone ?? null,
      data.scammer_characteristics ?? null,
      data.reporter_first_name,
      data.reporter_last_name,
      data.reporter_email,
      data.victim_age_range ?? null,
      data.victim_gender ?? null,
      data.victim_region ?? null,
      data.victim_role ?? null,
      data.contact_channel ?? null,
      data.scam_type ?? null,
      data.prior_scam_contact ?? null,
      data.declaration_accepted,
      data.terms_accepted,
      data.guidelines_accepted,
      data.ip_address ?? null,
      data.user_agent ?? null,
      data.referer ?? null,
      data.accept_language ?? null,
      data.forwarded_for ?? null,
    ]
  );
  return result.rows[0].id;
}

export interface ContentReportInput {
  content_url: string;
  content_type?: string;
  reason: string;
  description: string;
  reporter_email?: string;
  reporter_name?: string;
  ip_address?: string;
  user_agent?: string;
}

export async function insertContentReport(data: ContentReportInput): Promise<number> {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO content_reports (
      content_url, content_type, reason, description,
      reporter_email, reporter_name, ip_address, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      data.content_url,
      data.content_type ?? 'page',
      data.reason,
      data.description,
      data.reporter_email ?? null,
      data.reporter_name ?? null,
      data.ip_address ?? null,
      data.user_agent ?? null,
    ]
  );
  return result.rows[0].id;
}

export async function getReportById(id: number): Promise<ReportRow | null> {
  const db = getPool();
  const result = await db.query(
    'SELECT id, status, reporter_email, location FROM reports WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
}

export async function updateReportStatus(
  id: number,
  status: ReportStatus,
  notes?: string,
  operator?: string
): Promise<ReportRow | null> {
  const db = getPool();
  const result = await db.query(
    `UPDATE reports
     SET status = $2, moderated_at = NOW(), moderation_notes = $3
     WHERE id = $1
     RETURNING id, status, reporter_email, location`,
    [id, status, notes ?? null]
  );

  if (result.rows[0]) {
    const action = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'removed';
    await db.query(
      `INSERT INTO moderation_log (entity_type, reference_id, action, notes, operator)
       VALUES ('story', $1, $2, $3, $4)`,
      [id, action, notes ?? null, operator ?? null]
    );
  }

  return result.rows[0] ?? null;
}

export async function updateContentReportStatus(
  id: number,
  status: ContentReportStatus,
  notes?: string,
  operator?: string
): Promise<{ id: number; reporter_email: string | null } | null> {
  const db = getPool();
  const result = await db.query(
    `UPDATE content_reports
     SET status = $2, resolved_at = NOW(), resolution_notes = $3
     WHERE id = $1
     RETURNING id, reporter_email`,
    [id, status, notes ?? null]
  );

  if (result.rows[0]) {
    const action = status === 'resolved' ? 'resolved' : 'dismissed';
    await db.query(
      `INSERT INTO moderation_log (entity_type, reference_id, action, notes, operator)
       VALUES ('content', $1, $2, $3, $4)`,
      [id, action, notes ?? null, operator ?? null]
    );
  }

  return result.rows[0] ?? null;
}

export async function getApprovedExperiences(limit = 50): Promise<PublicExperience[]> {
  try {
    const db = getPool();
    const result = await db.query(
      `SELECT id, created_at, moderated_at, location, amount, money_taken, reported_to_police,
              events, attachments, reporter_first_name, reporter_last_name
       FROM reports
       WHERE status = 'approved'
       ORDER BY moderated_at DESC NULLS LAST, created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map((row) => ({
      id: row.id,
      created_at: new Date(row.created_at),
      moderated_at: row.moderated_at ? new Date(row.moderated_at) : null,
      location: row.location,
      amount: row.amount != null ? Number(row.amount) : null,
      money_taken: row.money_taken,
      reported_to_police: row.reported_to_police,
      events: parseEvents(row.events),
      attachments: parseAttachments(row.attachments),
      author_label: formatAuthorLabel(row.reporter_first_name, row.reporter_last_name),
    }));
  } catch {
    return [];
  }
}

export async function getApprovedAttachmentMeta(
  filename: string
): Promise<{ mimeType: string; originalName: string } | null> {
  try {
    const db = getPool();
    const result = await db.query(
      `SELECT elem->>'mimeType' AS mime_type, elem->>'originalName' AS original_name
       FROM reports, jsonb_array_elements(attachments) AS elem
       WHERE status = 'approved' AND elem->>'filename' = $1
       LIMIT 1`,
      [filename]
    );
    if (!result.rows[0]) return null;
    return {
      mimeType: result.rows[0].mime_type,
      originalName: result.rows[0].original_name,
    };
  } catch {
    return null;
  }
}

export async function getApprovedExperienceById(id: number): Promise<PublicExperience | null> {
  try {
    const db = getPool();
    const result = await db.query(
      `SELECT id, created_at, moderated_at, location, amount, money_taken, reported_to_police,
              events, attachments, reporter_first_name, reporter_last_name
       FROM reports
       WHERE id = $1 AND status = 'approved'`,
      [id]
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      created_at: new Date(row.created_at),
      moderated_at: row.moderated_at ? new Date(row.moderated_at) : null,
      location: row.location,
      amount: row.amount != null ? Number(row.amount) : null,
      money_taken: row.money_taken,
      reported_to_police: row.reported_to_police,
      events: parseEvents(row.events),
      attachments: parseAttachments(row.attachments),
      author_label: formatAuthorLabel(row.reporter_first_name, row.reporter_last_name),
    };
  } catch {
    return null;
  }
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
