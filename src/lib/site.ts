export const SITE_NAME = 'Truffe.info';
export const SITE_URL = 'https://truffe.info';

export const DEFAULT_TITLE = `${SITE_NAME} — Informazione e segnalazione truffe in Italia`;
export const DEFAULT_DESCRIPTION =
  'Archivio collettivo di informazioni sulle truffe online in Italia. Leggi le guide, le storie di truffa e segnala cosa ti è successo.';

export const DEFAULT_OG_IMAGE = '/og-default.svg';

export const GITHUB_URL = 'https://github.com/darioguarascio/truffe.info';
export const GITHUB_ISSUES_URL = `${GITHUB_URL}/issues`;

/** Cloudflare Turnstile site key (public) */
export const TURNSTILE_SITE_KEY =
  (import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined)?.trim() || '';

export const MAINTAINER_NAME = 'Dario Guarascio';
