import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host) return null;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter;
}

function getFrom(): string {
  return process.env.SMTP_FROM ?? 'noreply@truffe.info';
}

function getAdminEmail(): string | null {
  return process.env.ADMIN_EMAIL ?? null;
}

async function sendMail(options: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    console.warn('[email] SMTP not configured, skipping:', options.subject);
    return false;
  }

  try {
    await transport.sendMail({
      from: getFrom(),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ?? options.text.replace(/\n/g, '<br>'),
    });
    return true;
  } catch (err) {
    console.error('[email] Send failed:', err);
    return false;
  }
}

// User-facing email bodies remain in Italian

export async function notifyAdminNewStory(data: {
  id: number;
  location?: string;
  reporter_email: string;
}): Promise<void> {
  const admin = getAdminEmail();
  if (!admin) return;

  await sendMail({
    to: admin,
    subject: `[Truffe.info] Nuova segnalazione #${data.id} in attesa di moderazione`,
    text: [
      'È stata inviata una nuova segnalazione di truffa.',
      '',
      `ID: ${data.id}`,
      `Luogo: ${data.location ?? 'non specificato'}`,
      `Email segnalante: ${data.reporter_email}`,
      'Stato: in attesa di moderazione',
      '',
      'La segnalazione NON è pubblica finché non viene approvata.',
    ].join('\n'),
  });
}

export async function notifyAdminContentReport(data: {
  id: number;
  url: string;
  reason: string;
  description: string;
}): Promise<void> {
  const admin = getAdminEmail();
  if (!admin) return;

  await sendMail({
    to: admin,
    subject: `[Truffe.info] Segnalazione contenuto #${data.id}`,
    text: [
      'È stata ricevuta una segnalazione di contenuto.',
      '',
      `ID: ${data.id}`,
      `URL: ${data.url}`,
      `Motivo: ${data.reason}`,
      `Descrizione: ${data.description}`,
      '',
      'Procedere con la verifica entro tempi ragionevoli (notice-and-takedown).',
    ].join('\n'),
  });
}

export async function notifyRemovalAction(data: {
  entity_type: 'story' | 'content';
  id: number;
  action: string;
  notes?: string;
  affected_email?: string;
}): Promise<void> {
  const admin = getAdminEmail();
  const subject = `[Truffe.info] Azione di moderazione: ${data.action} (${data.entity_type} #${data.id})`;
  const body = [
    'È stata eseguita un\'azione di moderazione.',
    '',
    `Tipo: ${data.entity_type}`,
    `ID: ${data.id}`,
    `Azione: ${data.action}`,
    data.notes ? `Note: ${data.notes}` : '',
  ].filter(Boolean).join('\n');

  if (admin) {
    await sendMail({ to: admin, subject, text: body });
  }

  if (data.affected_email && ['rejected', 'removed', 'dismissed'].includes(data.action)) {
    await sendMail({
      to: data.affected_email,
      subject: '[Truffe.info] Aggiornamento sulla tua segnalazione',
      text: [
        'Ti informiamo che è stata presa una decisione riguardo alla tua segnalazione su Truffe.info.',
        '',
        `Riferimento: ${data.entity_type} #${data.id}`,
        `Esito: ${data.action}`,
        data.notes ? `Note: ${data.notes}` : '',
        '',
        'Per chiarimenti puoi rispondere a questa email o consultare i nostri Termini di utilizzo.',
        'https://truffe.info/termini',
      ].join('\n'),
    });
  }
}

export async function notifyUserSubmissionReceived(data: {
  email: string;
  id: number;
}): Promise<void> {
  await sendMail({
    to: data.email,
    subject: '[Truffe.info] Segnalazione ricevuta — in attesa di moderazione',
    text: [
      'Grazie per la tua segnalazione su Truffe.info.',
      '',
      `Riferimento: #${data.id}`,
      '',
      'La tua segnalazione è stata registrata ed è in attesa di verifica da parte del nostro team.',
      'Non verrà pubblicata finché non sarà approvata.',
      '',
      'Ricorda: racconta la tua esperienza in prima persona, senza insulti o accuse non dimostrabili.',
      'Linee guida: https://truffe.info/linee-guida',
    ].join('\n'),
  });
}
