import type { APIRoute } from 'astro';
import { insertSegnalazione } from '../../lib/db';
import { saveUploadedFile, getRequestMeta } from '../../lib/upload';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const dichiarazione = formData.get('dichiarazione_accettata');
    if (dichiarazione !== 'true') {
      return new Response(JSON.stringify({ error: 'Dichiarazione di responsabilità non accettata' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const vittima_nome = String(formData.get('vittima_nome') ?? '').trim();
    const vittima_cognome = String(formData.get('vittima_cognome') ?? '').trim();
    const vittima_email = String(formData.get('vittima_email') ?? '').trim();

    if (!vittima_nome || !vittima_cognome || !vittima_email) {
      return new Response(JSON.stringify({ error: 'Dati personali obbligatori mancanti' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(vittima_email)) {
      return new Response(JSON.stringify({ error: 'Indirizzo email non valido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let eventi = [];
    try {
      eventi = JSON.parse(String(formData.get('eventi') ?? '[]'));
    } catch {
      eventi = [];
    }

    const allegati = [];
    const files = formData.getAll('allegati');
    for (const file of files) {
      if (file instanceof File && file.size > 0) {
        const saved = await saveUploadedFile(file);
        if (saved) allegati.push(saved);
      }
    }

    const parseBool = (val: FormDataEntryValue | null): boolean | undefined => {
      const s = String(val ?? '');
      if (s === 'true') return true;
      if (s === 'false') return false;
      return undefined;
    };

    const sesso = String(formData.get('truffatore_sesso') ?? '');
    const importoStr = String(formData.get('importo') ?? '');

    const meta = getRequestMeta(request);

    const id = await insertSegnalazione({
      luogo: String(formData.get('luogo') ?? '').trim() || undefined,
      importo: importoStr ? parseFloat(importoStr) : undefined,
      denaro_sottratto: parseBool(formData.get('denaro_sottratto')),
      denuncia_polizia: parseBool(formData.get('denuncia_polizia')),
      eventi,
      allegati,
      truffatore_codename: String(formData.get('truffatore_codename') ?? '').trim() || undefined,
      truffatore_sesso: sesso === 'uomo' || sesso === 'donna' ? sesso : undefined,
      truffatore_nazionalita: String(formData.get('truffatore_nazionalita') ?? '').trim() || undefined,
      truffatore_nome: String(formData.get('truffatore_nome') ?? '').trim() || undefined,
      truffatore_telefono: String(formData.get('truffatore_telefono') ?? '').trim() || undefined,
      truffatore_caratteristiche: String(formData.get('truffatore_caratteristiche') ?? '').trim() || undefined,
      vittima_nome,
      vittima_cognome,
      vittima_email,
      dichiarazione_accettata: true,
      ...meta,
    });

    return new Response(JSON.stringify({ success: true, id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Errore segnalazione:', error);
    return new Response(JSON.stringify({ error: 'Errore interno del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
