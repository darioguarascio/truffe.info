import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getApprovedAttachmentMeta } from '../../../lib/db';
import { getUploadDir } from '../../../lib/upload';

export const prerender = false;

const SAFE_FILENAME = /^[a-f0-9-]{36}\.[a-z0-9]+$/i;

export const GET: APIRoute = async ({ params }) => {
  const filename = params.filename;
  if (!filename || !SAFE_FILENAME.test(filename)) {
    return new Response('Not found', { status: 404 });
  }

  const meta = await getApprovedAttachmentMeta(filename);
  if (!meta) {
    return new Response('Not found', { status: 404 });
  }

  const uploadDir = path.resolve(getUploadDir());
  const filePath = path.resolve(uploadDir, filename);
  if (!filePath.startsWith(`${uploadDir}${path.sep}`)) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const data = await fs.readFile(filePath);
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': meta.mimeType,
        'Content-Disposition': `inline; filename="${meta.originalName.replace(/"/g, '')}"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
