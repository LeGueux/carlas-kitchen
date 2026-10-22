// Changing this list also requires adding interface copy and translated categories.
export const locales = ['en', 'fr', 'pt-BR'] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = 'en';
export const languageNames: Record<Locale, string> = { en: 'English', fr: 'Français', 'pt-BR': 'Português (Brasil)' };
export function isLocale(value: string): value is Locale { return locales.includes(value as Locale); }
export function localePath(locale: Locale, path = ''): string {
  return `${locale === defaultLocale ? '' : `/${locale}`}/${path.replace(/^\/+/, '')}`;
}

/** Preserve published paths and queries when replacing the former Portuguese variant. */
export function brazilianPortugueseRedirect(url: URL): string | undefined {
  if (url.pathname === '/pt-PT' || url.pathname.startsWith('/pt-PT/')) {
    return `/pt-BR${url.pathname.slice('/pt-PT'.length) || '/'}${url.search}`;
  }
}
