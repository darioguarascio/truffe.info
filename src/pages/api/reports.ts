import type { APIRoute } from 'astro';
import { insertReport } from '../../lib/db';
import { saveUploadedFile, getRequestMeta } from '../../lib/upload';
import {
  notifyAdminNewStory,
  notifyUserSubmissionReceived,
} from '../../lib/email';

export const prerender = false;

const GENDER_MAP: Record<string, 'male' | 'female'> = {
  uomo: 'male',
  donna: 'female',
  male: 'male',
  female: 'female',
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    if (formData.get('declaration_accepted') !== 'true') {
      return jsonError('Dichiarazione di responsabilità non accettata', 400);
    }
    if (formData.get('terms_accepted') !== 'true') {
      return jsonError('Devi accettare i Termini di utilizzo', 400);
    }
    if (formData.get('guidelines_accepted') !== 'true') {
      return jsonError('Devi accettare le Linee guida della community', 400);
    }

    const reporter_first_name = String(formData.get('reporter_first_name') ?? '').trim();
    const reporter_last_name = String(formData.get('reporter_last_name') ?? '').trim();
    const reporter_email = String(formData.get('reporter_email') ?? '').trim();

    if (!reporter_first_name || !reporter_last_name || !reporter_email) {
      return jsonError('Dati personali obbligatori mancanti', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(reporter_email)) {
      return jsonError('Indirizzo email non valido', 400);
    }

    let events = [];
    try {
      events = JSON.parse(String(formData.get('events') ?? '[]'));
    } catch {
      events = [];
    }

    const attachments = [];
    for (const file of formData.getAll('attachments')) {
      if (file instanceof File && file.size > 0) {
        const saved = await saveUploadedFile(file);
        if (saved) attachments.push(saved);
      }
    }

    const parseBool = (val: FormDataEntryValue | null): boolean | undefined => {
      const s = String(val ?? '');
      if (s === 'true' || s === 'si') return true;
      if (s === 'false' || s === 'no') return false;
      return undefined;
    };

    const genderRaw = String(formData.get('scammer_gender') ?? '');
    const amountStr = String(formData.get('amount') ?? '');
    const meta = getRequestMeta(request);

    const id = await insertReport({
      location: String(formData.get('location') ?? '').trim() || undefined,
      amount: amountStr ? parseFloat(amountStr) : undefined,
      money_taken: parseBool(formData.get('money_taken')),
      reported_to_police: parseBool(formData.get('reported_to_police')),
      events,
      attachments,
      scammer_codename: String(formData.get('scammer_codename') ?? '').trim() || undefined,
      scammer_gender: GENDER_MAP[genderRaw],
      scammer_nationality: String(formData.get('scammer_nationality') ?? '').trim() || undefined,
      scammer_name: String(formData.get('scammer_name') ?? '').trim() || undefined,
      scammer_phone: String(formData.get('scammer_phone') ?? '').trim() || undefined,
      scammer_characteristics: String(formData.get('scammer_characteristics') ?? '').trim() || undefined,
      reporter_first_name,
      reporter_last_name,
      reporter_email,
      declaration_accepted: true,
      terms_accepted: true,
      guidelines_accepted: true,
      ...meta,
    });

    await Promise.all([
      notifyAdminNewStory({
        id,
        location: String(formData.get('location') ?? '').trim() || undefined,
        reporter_email,
      }),
      notifyUserSubmissionReceived({ id, email: reporter_email }),
    ]);

    return new Response(JSON.stringify({ success: true, id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Report submission failed:', error);
    return jsonError('Errore interno del server', 500);
  }
};

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
