import 'server-only';
import { headers } from 'next/headers';
import { getValidatedLocale, type SupportedLocale } from './config';
export async function getCurrentLocale(): Promise<SupportedLocale> {
  return getValidatedLocale((await headers()).get('x-bba-locale'));
}
