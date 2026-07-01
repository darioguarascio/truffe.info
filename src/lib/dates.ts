const IT_MONTHS = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
] as const;

/** Italian date: "4 Dicembre 2025" (Europe/Rome) */
export function formatDateIT(date: Date): string {
  const parts = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);

  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const year = Number(parts.find((p) => p.type === 'year')?.value);

  if (!day || !month || !year) {
    return date.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' });
  }

  const monthName = IT_MONTHS[month - 1];
  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `${day} ${monthCap} ${year}`;
}

/** Format event date strings from form data */
export function formatEventDateIT(dateStr?: string, timeStr?: string): string | null {
  if (!dateStr?.trim() && !timeStr?.trim()) return null;

  let datePart = '';
  if (dateStr?.trim()) {
    const raw = dateStr.trim();
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const italian = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (iso) {
      datePart = formatDateIT(new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3], 12)));
    } else if (italian) {
      datePart = formatDateIT(new Date(Date.UTC(+italian[3], +italian[2] - 1, +italian[1], 12)));
    } else {
      datePart = raw;
    }
  }

  const timePart = timeStr?.trim().slice(0, 5);
  return [datePart, timePart].filter(Boolean).join(' · ');
}
