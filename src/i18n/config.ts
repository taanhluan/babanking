export const supportedLocales = ['en', 'vi'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export const defaultLocale: SupportedLocale = 'en';
export const localeCookieName = 'bba_locale';
export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && supportedLocales.includes(value as SupportedLocale);
}
export const getValidatedLocale = (value: unknown): SupportedLocale => isSupportedLocale(value) ? value : defaultLocale;
export const getAlternateLocale = (locale: SupportedLocale): SupportedLocale => locale === 'en' ? 'vi' : 'en';
