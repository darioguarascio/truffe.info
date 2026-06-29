import type { TimelineEvent } from './db';

export interface PublicExperience {
  id: number;
  created_at: Date;
  moderated_at: Date | null;
  location: string | null;
  amount: number | null;
  money_taken: boolean | null;
  reported_to_police: boolean | null;
  events: TimelineEvent[];
}

export function parseEvents(raw: unknown): TimelineEvent[] {
  if (Array.isArray(raw)) return raw as TimelineEvent[];
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as TimelineEvent[];
    } catch {
      return [];
    }
  }
  return [];
}

export function experienceTitle(exp: PublicExperience): string {
  const desc = exp.events[0]?.description?.trim();
  if (desc) {
    return desc.length > 72 ? `${desc.slice(0, 72)}…` : desc;
  }
  if (exp.location) return `Truffa segnalata: ${exp.location}`;
  return `Storia segnalata #${exp.id}`;
}

export function experienceExcerpt(exp: PublicExperience): string {
  const text = exp.events
    .map((e) => e.description?.trim())
    .filter(Boolean)
    .join(' ');
  if (!text) return 'Storia personale moderata dalla community.';
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
}

export function experienceDate(exp: PublicExperience): Date {
  return exp.moderated_at ?? exp.created_at;
}
