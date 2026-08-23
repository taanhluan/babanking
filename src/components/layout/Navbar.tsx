import { getAccountAccessState } from '@/lib/membership';
import { NavbarClient } from './NavbarClient';
import { getCurrentLocale } from '@/i18n/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { getAccessibleContentSlugs } from '@/server/access-control/knowledge-access-repository';
import { BaDocumentRepository } from '@/server/ba-document/ba-document-repository';

export async function Navbar() {
  const state = await getAccountAccessState();
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const mode = state.hasPremiumAccess ? 'member' : state.user ? 'limited' : 'visitor';
  const permittedTypes = new Set<string>();
  if (state.user && mode === 'member') {
    const [content,documents]=await Promise.all([getAccessibleContentSlugs(state.user.id),BaDocumentRepository.listPublishedAuthorized(state.user.id)]);
    content.forEach((item)=>permittedTypes.add(item.type));
    if(documents.length)permittedTypes.add('BA_DOCUMENT');
  }
  return <NavbarClient mode={mode} role={state.user?.role} locale={locale} labels={dictionary.nav} permittedTypes={[...permittedTypes]} />;
}
