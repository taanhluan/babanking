import { getAccountAccessState } from '@/lib/membership';
import { NavbarClient } from './NavbarClient';
import { getCurrentLocale } from '@/i18n/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { getAccessibleContentSlugs } from '@/server/access-control/knowledge-access-repository';

export async function Navbar() {
  const state = await getAccountAccessState();
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const mode = state.hasPremiumAccess ? 'member' : state.user ? 'limited' : 'visitor';
  const permittedTypes = state.user && mode === 'member'
    ? new Set((await getAccessibleContentSlugs(state.user.id)).map((item) => item.type))
    : new Set<string>();
  return <NavbarClient mode={mode} role={state.user?.role} locale={locale} labels={dictionary.nav} permittedTypes={[...permittedTypes]} />;
}
