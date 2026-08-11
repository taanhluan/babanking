import Link from 'next/link';
import { BrandMark } from '@/components/ui/BrandMark';
import { getCurrentLocale } from '@/i18n/server';
import { getDictionary } from '@/i18n/get-dictionary';
export async function Footer({mode='visitor'}:{mode?:'visitor'|'member'}) {
  const locale=await getCurrentLocale(),d=getDictionary(locale);
  return <footer className="border-t border-white/10 bg-navy px-4 py-10 text-slate-300"><div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-start md:justify-between"><div><Link href={`/${locale}`} className="inline-flex"><BrandMark/></Link><p className="mt-4 max-w-md text-sm leading-6">{d.footer.description}</p></div><nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">{mode==='visitor'?<><Link href={`/${locale}/request-access`}>{d.nav.request}</Link><Link href={`/${locale}/login`}>{d.nav.login}</Link></>:<><Link href={`/${locale}/workspace`}>{d.nav.workspace}</Link><Link href={`/${locale}/account/membership`}>{d.nav.account}</Link></>}<Link href={`/${locale}/privacy`}>{d.footer.privacy}</Link><Link href={`/${locale}/terms`}>{d.footer.terms}</Link><Link href={`/${locale}/membership-terms`}>{d.footer.membershipTerms}</Link></nav></div><p className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-5 text-xs text-slate-400">© 2026 Banking BA Knowledge Hub. {d.footer.rights}</p></footer>;
}
