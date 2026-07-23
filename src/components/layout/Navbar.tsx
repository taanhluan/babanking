import { getAccountAccessState } from '@/lib/membership';
import { NavbarClient } from './NavbarClient';
import { getCurrentLocale } from '@/i18n/server';
import { getDictionary } from '@/i18n/get-dictionary';

export async function Navbar() {
  const state = await getAccountAccessState();
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const mode = state.hasPremiumAccess ? 'member' : state.user ? 'limited' : 'visitor';
  return <NavbarClient mode={mode} role={state.user?.role} locale={locale} labels={dictionary.nav} />;
}
