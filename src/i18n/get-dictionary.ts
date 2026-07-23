import 'server-only';
import type { SupportedLocale } from './config';
import { en } from './dictionaries/en';
import { vi } from './dictionaries/vi';
export function getDictionary(locale: SupportedLocale) {
  return locale === 'vi' ? vi : en;
}
