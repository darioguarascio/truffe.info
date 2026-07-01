import type { APIRoute } from 'astro';
import { notifyContactMessage } from '../../lib/email';
import { getRequestMeta } from '../../lib/upload';
import { verifyTurnstile } from '../../lib/turnstile';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (String(body.company ?? '').trim()) {
      return jsonError('Invio non riuscito', 400);
    }

    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim();
    const subject = String(body.subject ?? '').trim();
    const message = String(body.message ?? '').trim();
    const turnstileToken = String(body.turnstile_token ?? '').trim();

    if (!name || !email || !subject || !message) {
      return jsonError('Compila tutti i campi obbligatori', 400);
    }

    if (name.length > 120 || subject.length > 200) {
      return jsonError('Nome o oggetto troppo lunghi', 400);
    }

    if (message.length < 20) {
      return jsonError('Il messaggio deve contenere almeno 20 caratteri', 400);
    }

    if (message.length > 5000) {
      return jsonError('Il messaggio è troppo lungo', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonError('Indirizzo email non valido', 400);
    }

    const meta = getRequestMeta(request);
    const verified = await verifyTurnstile(turnstileToken, meta.ip_address);
    if (!verified) {
      return jsonError('Verifica captcha non superata. Riprova.', 400);
    }

    const sent = await notifyContactMessage({ name, email, subject, message });
    if (!sent) {
      return jsonError('Impossibile inviare il messaggio in questo momento. Riprova più tardi.', 503);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Contact form submission failed:', error);
    return jsonError('Errore interno del server', 500);
  }
};

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
