import type { SupportedLocale } from './config';
import { defaultLocale, isSupportedLocale } from './config';

export function getLocaleFromPath(pathname: string): SupportedLocale | null {
  const segment = pathname.split('/')[1];
  return isSupportedLocale(segment) ? segment : null;
}
export function stripLocale(pathname: string) {
  const locale = getLocaleFromPath(pathname);
  if (!locale) return pathname || '/';
  const stripped = pathname.slice(locale.length + 1);
  return stripped || '/';
}
export function getLocalizedPath(pathname: string, locale: SupportedLocale = defaultLocale) {
  const path = stripLocale(pathname);
  return path === '/' ? `/${locale}` : `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
}
export function replacePathLocale(pathname: string, locale: SupportedLocale) {
  return getLocalizedPath(pathname, locale);
}
