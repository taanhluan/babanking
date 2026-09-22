import Link from 'next/link';
import { LockKeyhole, Search, ShieldCheck } from 'lucide-react';
import { Suspense } from 'react';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { Reveal } from '@/components/ui/Reveal';
import { getDictionary } from '@/i18n/get-dictionary';
import { getCurrentLocale } from '@/i18n/server';
import { LandingMembershipSection } from './LandingMembershipSection';
import { ScrollChapter } from './ScrollChapter';
import { ScrollVideoExperience } from './ScrollVideoExperience';

function MembershipFallback() {
  return <section id="membership" className="bg-navy px-4 py-20 text-white sm:px-6"><div className="mx-auto max-w-7xl"><div className="h-9 w-56 animate-pulse rounded bg-white/10" /><div className="mt-8 h-56 animate-pulse rounded-2xl border border-white/10 bg-white/5" /></div></section>;
}

export async function LandingPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const l = dictionary.landing;

  return <><Navbar /><main>
    <ScrollVideoExperience />

    <section className="bg-navy px-4 py-20 text-white sm:px-6 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <Reveal>
          <p className="text-sm font-semibold text-goldLight">{l.eyebrow}</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">{l.headline}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{l.supporting}</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href={`/${locale}/request-access`} className="inline-flex min-h-12 items-center rounded-xl bg-royalBlue px-6 font-semibold">{l.primary}</Link><Link href={`/${locale}/login`} className="inline-flex min-h-12 items-center rounded-xl border border-white/25 px-6 font-semibold">{l.secondary}</Link></div>
          <p className="mt-5 text-sm text-slate-400">{l.trust}</p>
        </Reveal>
        <Reveal delay={120}>
          <div className="rounded-[28px] border border-white/15 bg-white/5 p-5"><div className="flex items-center justify-between border-b border-white/10 pb-4"><span className="font-semibold">{l.workspace}</span><span className="inline-flex items-center gap-2 rounded-full bg-goldAccent/15 px-3 py-1 text-xs text-goldLight"><LockKeyhole className="h-4 w-4" />{l.membersOnly}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{l.previews.map((x) => <div key={x} className="rounded-2xl border border-white/10 bg-navyLight p-5"><p className="text-sm font-semibold">{x}</p><div className="mt-4 h-2 w-3/4 rounded bg-white/15" /></div>)}</div><div className="mt-3 flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 px-4 text-sm text-slate-300"><Search className="h-5 w-5" />{l.memberSearch}</div></div>
        </Reveal>
      </div>
    </section>

    <ScrollChapter id="membership-preview" eyebrow={l.previewEyebrow} title={l.previewTitle} copy={l.previewCopy} items={l.pillars.map(([title, copy]) => ({ title, copy }))} locale={locale} actionLabel={l.requestAccess} />

    <ScrollChapter id="methodology" eyebrow="BA DELIVERY METHOD" title={l.methodTitle} copy={l.countFallback} items={l.methods.map(([title, copy]) => ({ title, copy }))} locale={locale} tone="dark" />

    <section className="px-4 py-20 sm:px-6"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2"><div><Reveal><h2 className="text-3xl font-semibold text-navy">{l.outcomesTitle}</h2></Reveal><ul className="mt-6 grid gap-3 text-textSecondary">{l.outcomes.map((x, index) => <li key={x}><Reveal delay={120 + index * 70}><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-royalBlue" />{x}</div></Reveal></li>)}</ul></div><div><Reveal delay={120}><h2 className="text-3xl font-semibold text-navy">{l.processTitle}</h2></Reveal><ol className="mt-6 space-y-4">{l.process.map((x, index) => <li key={x}><Reveal delay={180 + index * 90}><div className="flex items-center gap-4 rounded-xl bg-white p-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy font-semibold text-white">{index + 1}</span><span className="font-semibold">{x}</span></div></Reveal></li>)}</ol></div></div></section>

    <Reveal><Suspense fallback={<MembershipFallback />}><LandingMembershipSection locale={locale} title={l.membershipTitle} noPlanTitle={l.noPlanTitle} noPlan={l.noPlan} requestMembership={l.requestMembership} /></Suspense></Reveal>

    <section id="faq" className="px-4 py-20 sm:px-6"><div className="mx-auto max-w-4xl"><Reveal><h2 className="text-3xl font-semibold text-navy">{l.faqTitle}</h2></Reveal><div className="mt-8 space-y-3">{l.faqs.map(([question, answer], index) => <Reveal key={question} delay={index * 70}><details className="rounded-xl border border-slate-200 bg-white p-5"><summary className="min-h-11 cursor-pointer font-semibold">{question}</summary><p className="pt-2 leading-7 text-textSecondary">{answer}</p></details></Reveal>)}</div></div></section>

    <section className="bg-goldPale px-4 py-16 text-center"><Reveal><h2 className="text-3xl font-semibold text-navy">{l.finalTitle}</h2><p className="mx-auto mt-3 max-w-2xl text-textSecondary">{l.finalCopy}</p><Link href={`/${locale}/request-access`} className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-navy px-6 font-semibold text-white">{l.primary}</Link></Reveal></section>
  </main><Footer /></>;
}
