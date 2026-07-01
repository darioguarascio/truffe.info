import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { VictimStatsInput } from './victim-stats';
import {
  labelForOption,
  VICTIM_AGE_RANGES,
  VICTIM_GENDERS,
  VICTIM_ROLES,
  CONTACT_CHANNELS,
  SCAM_TYPES,
  ITALIAN_REGIONS,
} from './victim-stats';

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
  replyTo?: string;
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
      replyTo: options.replyTo,
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
  victimStats?: VictimStatsInput;
}): Promise<void> {
  const admin = getAdminEmail();
  if (!admin) return;

  const stats = data.victimStats;
  const statsLines: string[] = [];
  if (stats) {
    const age = labelForOption(VICTIM_AGE_RANGES, stats.victim_age_range);
    const gender = labelForOption(VICTIM_GENDERS, stats.victim_gender);
    const region = labelForOption(ITALIAN_REGIONS, stats.victim_region);
    const role = labelForOption(VICTIM_ROLES, stats.victim_role);
    const channel = labelForOption(CONTACT_CHANNELS, stats.contact_channel);
    const scamType = labelForOption(SCAM_TYPES, stats.scam_type);
    if (age) statsLines.push(`Fascia d'età: ${age}`);
    if (gender) statsLines.push(`Sesso: ${gender}`);
    if (region) statsLines.push(`Regione: ${region}`);
    if (role) statsLines.push(`Chi ha subito: ${role}`);
    if (channel) statsLines.push(`Primo contatto: ${channel}`);
    if (scamType) statsLines.push(`Tipo truffa: ${scamType}`);
    if (stats.prior_scam_contact === true) statsLines.push('Tentativi precedenti: sì');
    if (stats.prior_scam_contact === false) statsLines.push('Tentativi precedenti: no');
  }

  await sendMail({
    to: admin,
    subject: `[Truffe.info] Nuova segnalazione #${data.id} in attesa di moderazione`,
    text: [
      'È stata inviata una nuova segnalazione di truffa.',
      '',
      `ID: ${data.id}`,
      `Luogo: ${data.location ?? 'non specificato'}`,
      `Email segnalante: ${data.reporter_email}`,
      ...(statsLines.length > 0 ? ['', 'Dati statistici (non pubblici):', ...statsLines] : []),
      '',
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
      'Non pubblicare sui social nome o foto di presunti truffatori: in Italia può essere illegale anche se hai ragione.',
      'Guida rischi legali: https://truffe.info/truffe/esposizione-pubblica-truffatori-rischi-legali',
      'Linee guida: https://truffe.info/linee-guida',
    ].join('\n'),
  });
}

function getContactInbox(): string | null {
  return (
    process.env.CONTACT_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    'ciao@truffe.info'
  );
}

export async function notifyContactMessage(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<boolean> {
  const inbox = getContactInbox();
  if (!inbox) return false;

  const body = [
    'Nuovo messaggio dal modulo contatti di Truffe.info.',
    '',
    `Nome: ${data.name}`,
    `Email: ${data.email}`,
    `Oggetto: ${data.subject}`,
    '',
    'Messaggio:',
    data.message,
    '',
    '---',
    'Rispondi direttamente a questa email per contattare il mittente.',
  ].join('\n');

  return sendMail({
    to: inbox,
    subject: `[Truffe.info] Contatto: ${data.subject}`,
    text: body,
    replyTo: data.email,
  });
}
