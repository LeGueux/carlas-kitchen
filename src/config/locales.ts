// Changing this list also requires adding interface copy and translated categories.
export const locales = ['en', 'fr', 'pt-PT'] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = 'en';
export const languageNames: Record<Locale, string> = { en: 'English', fr: 'Français', 'pt-PT': 'Português' };
export function isLocale(value: string): value is Locale { return locales.includes(value as Locale); }
export function localePath(locale: Locale, path = ''): string {
  return `${locale === defaultLocale ? '' : `/${locale}`}/${path.replace(/^\/+/, '')}`;
}
