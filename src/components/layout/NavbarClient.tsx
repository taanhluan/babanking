'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { Role } from '@prisma/client';
import { BrandMark } from '@/components/ui/BrandMark';
import { logoutAction,setLocaleAction } from '@/app/actions';
import type { SupportedLocale } from '@/i18n/config';
import { getAlternateLocale } from '@/i18n/config';
import { getLocalizedPath } from '@/i18n/routing';

type Labels = { overview:string;unlock:string;methodology:string;membership:string;faq:string;login:string;request:string;journeys:string;practice:string;cases:string;roadmap:string;search:string;workspace:string;status:string;renewal:string;admin:string;adminConsole:string;account:string;logout:string };
export function NavbarClient({ mode, role, locale, labels }: { mode:'visitor'|'limited'|'member'; role?:Role; locale:SupportedLocale; labels:Labels }) {
  const [open,setOpen]=useState(false); const pathname=usePathname(); const query=useSearchParams();
  useEffect(()=>{if(!open)return;const close=(e:KeyboardEvent)=>e.key==='Escape'&&setOpen(false);window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[open]);
  const publicLinks=[[labels.overview,'/#overview'],[labels.unlock,'/#membership-preview'],[labels.methodology,'/#methodology'],[labels.membership,'/#membership'],[labels.faq,'/#faq']] as const;
  const premiumLinks=[[labels.journeys,'/banking-journeys'],[labels.practice,'/ba-practice'],[labels.cases,'/case-studies'],[labels.roadmap,'/career-roadmap'],[labels.search,'/search'],[labels.workspace,'/workspace']] as const;
  const links=mode==='member'?premiumLinks:mode==='limited'?[[labels.status,'/account/membership'],[labels.renewal,'/account/renewal']] as const:publicLinks;
  const localize=(href:string)=>href.startsWith('/#')?`/${locale}${href.slice(1)}`:getLocalizedPath(href,locale);
  const queryString=query.toString(); const alternateBase=getLocalizedPath(pathname,getAlternateLocale(locale)); const alternate=queryString?`${alternateBase}?${queryString}`:alternateBase;
  return <header className="sticky top-0 z-50 min-h-[72px] border-b border-white/10 bg-navy/95"><div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
    <Link href={`/${locale}`} aria-label="Banking BA Knowledge Hub home"><BrandMark/></Link>
    <nav aria-label="Primary navigation" className="hidden items-center gap-4 text-sm font-medium lg:flex">{links.map(([label,href])=><Link key={href} href={localize(href)} prefetch={mode==='member'?undefined:false} className="text-slate-200 hover:text-white">{label}</Link>)}
      {mode==='visitor'?<><Link href={`/${locale}/login`} className="text-slate-200">{labels.login}</Link><Link href={`/${locale}/request-access`} className="inline-flex min-h-11 items-center rounded-xl bg-royalBlue px-4 font-semibold text-white">{labels.request}</Link></>:null}
      {mode==='limited'?<Link href={`/${locale}/account/access`} className="inline-flex min-h-11 items-center rounded-xl bg-royalBlue px-4 font-semibold text-white">{labels.status}</Link>:null}
      {mode==='member'&&role==='ADMIN'?<Link href={`/${locale}/admin`} className="text-goldLight">{labels.admin}</Link>:null}
      <form action={setLocaleAction}><input type="hidden" name="locale" value={getAlternateLocale(locale)}/><input type="hidden" name="target" value={alternate}/><button aria-label={locale==='en'?'Chuyển sang Tiếng Việt':'Switch to English'} className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-3 font-semibold text-goldLight">{locale==='en'?'VNI':'ENG'}</button></form>
      {mode!=='visitor'?<form action={logoutAction}><button className="min-h-11 rounded-xl border border-white/20 px-4 font-semibold text-white">{labels.logout}</button></form>:null}
    </nav>
    <button type="button" aria-expanded={open} aria-controls="mobile-nav" aria-label="Toggle navigation" onClick={()=>setOpen(!open)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 text-white lg:hidden">{open?<X/>:<Menu/>}</button>
  </div>{open?<nav id="mobile-nav" aria-label="Mobile navigation" className="border-t border-white/10 bg-navy p-4 lg:hidden"><div className="flex flex-col">{links.map(([label,href])=><Link key={href} href={localize(href)} prefetch={false} onClick={()=>setOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-slate-100">{label}</Link>)}
    {mode==='visitor'?<><Link href={`/${locale}/login`} className="flex min-h-11 items-center px-3 text-slate-100">{labels.login}</Link><Link href={`/${locale}/request-access`} className="mt-2 flex min-h-11 items-center justify-center rounded-xl bg-royalBlue px-3 font-semibold text-white">{labels.request}</Link></>:null}
    {mode!=='visitor'?<><Link href={role==='ADMIN'?`/${locale}/admin`:`/${locale}/account/membership`} className="mt-2 flex min-h-11 items-center justify-center rounded-xl bg-royalBlue px-3 font-semibold text-white">{role==='ADMIN'?labels.adminConsole:labels.account}</Link><form action={logoutAction}><button className="mt-2 min-h-11 w-full rounded-xl border border-white/20 px-3 text-left font-semibold text-white">{labels.logout}</button></form></>:null}
    <form action={setLocaleAction}><input type="hidden" name="locale" value={getAlternateLocale(locale)}/><input type="hidden" name="target" value={alternate}/><button className="mt-2 flex min-h-11 w-full items-center px-3 font-semibold text-goldLight">{locale==='en'?'VNI · Tiếng Việt':'ENG · English'}</button></form>
  </div></nav>:null}</header>;
}
