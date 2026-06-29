import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { FileAttachment } from './db';

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf', 'text/plain',
]);

export function getUploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
}

export function getMaxUploadBytes(): number {
  const mb = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '25', 10);
  return mb * 1024 * 1024;
}

export async function saveUploadedFile(
  file: File
): Promise<FileAttachment | null> {
  if (!ALLOWED_TYPES.has(file.type)) return null;
  if (file.size > getMaxUploadBytes()) return null;

  const uploadDir = getUploadDir();
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.name) || '';
  const filename = `${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadDir, filename), buffer);

  return {
    filename,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
  };
}

export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim();
  return request.headers.get('x-real-ip') ?? undefined;
}

export function getRequestMeta(request: Request) {
  return {
    ip_address: getClientIp(request),
    user_agent: request.headers.get('user-agent') ?? undefined,
    referer: request.headers.get('referer') ?? undefined,
    accept_language: request.headers.get('accept-language') ?? undefined,
    forwarded_for: request.headers.get('x-forwarded-for') ?? undefined,
  };
}
