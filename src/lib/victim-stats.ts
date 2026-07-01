/** Victim demographics for internal statistics — never published on public stories. */

export type VictimAgeRange =
  | 'under_18'
  | '18_24'
  | '25_34'
  | '35_44'
  | '45_54'
  | '55_64'
  | '65_plus'
  | 'prefer_not_say';

export type VictimGender = 'male' | 'female' | 'other' | 'prefer_not_say';

export type VictimRole = 'self' | 'family' | 'acquaintance' | 'business' | 'other';

export type ContactChannel =
  | 'phone'
  | 'sms'
  | 'email'
  | 'whatsapp'
  | 'social_media'
  | 'website'
  | 'in_person'
  | 'postal'
  | 'other';

export type ScamType =
  | 'investment'
  | 'phishing'
  | 'romance'
  | 'impersonation'
  | 'marketplace'
  | 'lottery'
  | 'employment'
  | 'rental'
  | 'tech_support'
  | 'other';

export interface VictimStatsInput {
  victim_age_range?: VictimAgeRange;
  victim_gender?: VictimGender;
  victim_region?: string;
  victim_role?: VictimRole;
  contact_channel?: ContactChannel;
  scam_type?: ScamType;
  prior_scam_contact?: boolean;
}

export const VICTIM_AGE_RANGES: { value: VictimAgeRange; label: string }[] = [
  { value: 'under_18', label: 'Meno di 18 anni' },
  { value: '18_24', label: '18–24 anni' },
  { value: '25_34', label: '25–34 anni' },
  { value: '35_44', label: '35–44 anni' },
  { value: '45_54', label: '45–54 anni' },
  { value: '55_64', label: '55–64 anni' },
  { value: '65_plus', label: '65 anni o più' },
  { value: 'prefer_not_say', label: 'Preferisco non rispondere' },
];

export const VICTIM_GENDERS: { value: VictimGender; label: string }[] = [
  { value: 'male', label: 'Uomo' },
  { value: 'female', label: 'Donna' },
  { value: 'other', label: 'Altro' },
  { value: 'prefer_not_say', label: 'Preferisco non rispondere' },
];

export const VICTIM_ROLES: { value: VictimRole; label: string }[] = [
  { value: 'self', label: 'Io personalmente' },
  { value: 'family', label: 'Un familiare' },
  { value: 'acquaintance', label: 'Un conoscente' },
  { value: 'business', label: 'La mia attività o azienda' },
  { value: 'other', label: 'Altro' },
];

export const CONTACT_CHANNELS: { value: ContactChannel; label: string }[] = [
  { value: 'phone', label: 'Telefonata' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp / Telegram' },
  { value: 'social_media', label: 'Social media' },
  { value: 'website', label: 'Sito web o app' },
  { value: 'in_person', label: 'Di persona' },
  { value: 'postal', label: 'Posta o corriere' },
  { value: 'other', label: 'Altro' },
];

export const SCAM_TYPES: { value: ScamType; label: string }[] = [
  { value: 'phishing', label: 'Phishing / falso operatore bancario' },
  { value: 'impersonation', label: 'Falsa autorità (polizia, Agenzia Entrate…)' },
  { value: 'investment', label: 'Investimenti / crypto' },
  { value: 'romance', label: 'Truffa sentimentale' },
  { value: 'marketplace', label: 'Acquisto online / marketplace' },
  { value: 'lottery', label: 'Falso premio / lotteria' },
  { value: 'employment', label: 'Falso lavoro' },
  { value: 'rental', label: 'Affitto / immobiliare' },
  { value: 'tech_support', label: 'Falso supporto tecnico' },
  { value: 'other', label: 'Altro / non so' },
];

export const ITALIAN_REGIONS: { value: string; label: string }[] = [
  { value: 'abruzzo', label: 'Abruzzo' },
  { value: 'basilicata', label: 'Basilicata' },
  { value: 'calabria', label: 'Calabria' },
  { value: 'campania', label: 'Campania' },
  { value: 'emilia_romagna', label: 'Emilia-Romagna' },
  { value: 'friuli_venezia_giulia', label: 'Friuli-Venezia Giulia' },
  { value: 'lazio', label: 'Lazio' },
  { value: 'liguria', label: 'Liguria' },
  { value: 'lombardia', label: 'Lombardia' },
  { value: 'marche', label: 'Marche' },
  { value: 'molise', label: 'Molise' },
  { value: 'piemonte', label: 'Piemonte' },
  { value: 'puglia', label: 'Puglia' },
  { value: 'sardegna', label: 'Sardegna' },
  { value: 'sicilia', label: 'Sicilia' },
  { value: 'toscana', label: 'Toscana' },
  { value: 'trentino_alto_adige', label: 'Trentino-Alto Adige' },
  { value: 'umbria', label: 'Umbria' },
  { value: 'valle_aosta', label: "Valle d'Aosta" },
  { value: 'veneto', label: 'Veneto' },
  { value: 'abroad', label: "All'estero" },
  { value: 'prefer_not_say', label: 'Preferisco non rispondere' },
];

const REGION_VALUES = new Set(ITALIAN_REGIONS.map((r) => r.value));

export function parseVictimStats(form: {
  victim_age_range?: string | null;
  victim_gender?: string | null;
  victim_region?: string | null;
  victim_role?: string | null;
  contact_channel?: string | null;
  scam_type?: string | null;
  prior_scam_contact?: string | null;
}): VictimStatsInput {
  const result: VictimStatsInput = {};

  const age = form.victim_age_range?.trim();
  if (age && VICTIM_AGE_RANGES.some((o) => o.value === age)) {
    result.victim_age_range = age as VictimAgeRange;
  }

  const gender = form.victim_gender?.trim();
  if (gender && VICTIM_GENDERS.some((o) => o.value === gender)) {
    result.victim_gender = gender as VictimGender;
  }

  const region = form.victim_region?.trim();
  if (region && REGION_VALUES.has(region)) {
    result.victim_region = region;
  }

  const role = form.victim_role?.trim();
  if (role && VICTIM_ROLES.some((o) => o.value === role)) {
    result.victim_role = role as VictimRole;
  }

  const channel = form.contact_channel?.trim();
  if (channel && CONTACT_CHANNELS.some((o) => o.value === channel)) {
    result.contact_channel = channel as ContactChannel;
  }

  const scamType = form.scam_type?.trim();
  if (scamType && SCAM_TYPES.some((o) => o.value === scamType)) {
    result.scam_type = scamType as ScamType;
  }

  const prior = form.prior_scam_contact?.trim();
  if (prior === 'true' || prior === 'si') result.prior_scam_contact = true;
  if (prior === 'false' || prior === 'no') result.prior_scam_contact = false;

  return result;
}

export function labelForOption<T extends string>(
  options: { value: T; label: string }[],
  value?: string | null
): string | undefined {
  if (!value) return undefined;
  return options.find((o) => o.value === value)?.label;
}
