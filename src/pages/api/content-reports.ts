import type { APIRoute } from 'astro';
import { insertContentReport } from '../../lib/db';
import { getRequestMeta } from '../../lib/upload';
import { notifyAdminContentReport } from '../../lib/email';

export const prerender = false;

const VALID_REASONS = ['defamation', 'personal_data', 'offensive_content', 'false_information', 'other'];

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const content_url = String(body.content_url ?? '').trim();
    const reason = String(body.reason ?? '').trim();
    const description = String(body.description ?? '').trim();

    if (!content_url || !reason || !description) {
      return jsonError('Compila tutti i campi obbligatori', 400);
    }

    if (!VALID_REASONS.includes(reason)) {
      return jsonError('Motivo non valido', 400);
    }

    if (description.length < 20) {
      return jsonError('La descrizione deve contenere almeno 20 caratteri', 400);
    }

    const meta = getRequestMeta(request);

    const id = await insertContentReport({
      content_url,
      content_type: String(body.content_type ?? 'page'),
      reason,
      description,
      reporter_email: String(body.reporter_email ?? body.email ?? '').trim() || undefined,
      reporter_name: String(body.reporter_name ?? body.name ?? '').trim() || undefined,
      ...meta,
    });

    await notifyAdminContentReport({ id, url: content_url, reason, description });

    return new Response(JSON.stringify({ success: true, id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Content report submission failed:', error);
    return jsonError('Errore interno del server', 500);
  }
};

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
