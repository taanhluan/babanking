import Link from 'next/link';
import type { Route } from 'next';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { PageHero } from '@/components/layout/PageHero';
import { Container } from '@/components/ui/Container';
import { glossaryCopy, glossaryDomainLabels, glossaryKindLabels, jurisdictionLabel, regulationStatusLabels, regulationStatusTone } from '@/components/glossary/glossary-copy';
import { getCurrentLocale } from '@/i18n/server';
import { requirePremiumAccess } from '@/lib/membership';
import { filterGlossaryEntries, glossaryDisplayName, glossaryDomains, glossaryInitial, glossaryKinds, type GlossaryFilters } from '@/server/glossary/glossary-domain';
import { GlossaryRepository } from '@/server/glossary/glossary-repository';

const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];

export default async function GlossaryPage({ searchParams }: { searchParams: Promise<GlossaryFilters> }) {
  const user = await requirePremiumAccess('/glossary');
  const [params, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const copy = glossaryCopy[locale];
  const entries = await GlossaryRepository.listPublishedAuthorized(user.id);
  const filters: GlossaryFilters = {
    q: params.q?.slice(0, 120),
    kind: glossaryKinds.find((kind) => kind === params.kind),
    domain: glossaryDomains.find((domain) => domain === params.domain),
    jurisdiction: params.jurisdiction?.slice(0, 20),
    letter: letters.find((letter) => letter === params.letter),
  };
  const results = filterGlossaryEntries(entries, filters, locale);
  const jurisdictions = [...new Set(entries.flatMap((entry) => entry.content.regulation ? [entry.content.regulation.jurisdiction] : []))].sort();
  const availableLetters = new Set(filterGlossaryEntries(entries, { ...filters, letter: undefined }, locale).map((entry) => glossaryInitial(glossaryDisplayName(entry.content, locale))));
  const letterHref = (letter?: string) => {
    const query = new URLSearchParams(Object.entries({ ...filters, letter }).filter((pair): pair is [string, string] => Boolean(pair[1])));
    const value = query.toString();
    return (value ? `/glossary?${value}` : '/glossary') as Route;
  };

  return <><Navbar/><main>
    <PageHero eyebrow={copy.eyebrow} title={copy.title} description={copy.description} current={copy.current}/>
    <section className="px-4 py-10 sm:px-6"><Container>
      <form className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <input name="q" defaultValue={filters.q} placeholder={copy.search} aria-label={copy.search} className="min-h-11 min-w-0 rounded-xl border px-3"/>
        <select name="kind" defaultValue={filters.kind ?? ''} aria-label={copy.allKinds} className="min-h-11 rounded-xl border px-3"><option value="">{copy.allKinds}</option>{glossaryKinds.map((kind) => <option key={kind} value={kind}>{glossaryKindLabels[locale][kind]}</option>)}</select>
        <select name="domain" defaultValue={filters.domain ?? ''} aria-label={copy.allDomains} className="min-h-11 rounded-xl border px-3"><option value="">{copy.allDomains}</option>{glossaryDomains.map((domain) => <option key={domain} value={domain}>{glossaryDomainLabels[locale][domain]}</option>)}</select>
        <select name="jurisdiction" defaultValue={filters.jurisdiction ?? ''} aria-label={copy.allJurisdictions} className="min-h-11 rounded-xl border px-3"><option value="">{copy.allJurisdictions}</option>{jurisdictions.map((value) => <option key={value} value={value}>{jurisdictionLabel(value, locale)}</option>)}</select>
        <div className="flex gap-2"><button className="min-h-11 rounded-xl bg-royalBlue px-4 font-semibold text-white">{copy.apply}</button><Link href="/glossary" className="inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold text-navy">{copy.reset}</Link></div>
      </form>
      <nav aria-label="A–Z" className="mt-5 flex flex-wrap gap-1.5">
        {letters.map((letter) => availableLetters.has(letter)
          ? <Link key={letter} href={letterHref(filters.letter === letter ? undefined : letter)} aria-current={filters.letter === letter ? 'true' : undefined} className={`inline-flex size-9 items-center justify-center rounded-lg border text-sm font-semibold ${filters.letter === letter ? 'border-royalBlue bg-royalBlue text-white' : 'bg-white text-navy hover:border-royalBlue'}`}>{letter}</Link>
          : <span key={letter} aria-hidden="true" className="inline-flex size-9 items-center justify-center rounded-lg border border-dashed text-sm text-slate-300">{letter}</span>)}
      </nav>
      <p className="mt-5 text-sm text-textSecondary">{copy.count(results.length)}</p>
      {results.length ? <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{results.map(({ slug, content }) => <Link key={slug} href={`/glossary/${slug}` as Route} className="flex min-w-0 flex-col rounded-2xl border bg-white p-5 hover:border-royalBlue">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-royalBlue"><span>{glossaryKindLabels[locale][content.kind]}</span>{content.abbreviation ? <span className="text-slate-500">· {content.abbreviation}</span> : null}{content.regulation ? <span className={`rounded-full border px-2 py-0.5 normal-case ${regulationStatusTone[content.regulation.status]}`}>{regulationStatusLabels[locale][content.regulation.status]}</span> : null}</div>
        <h2 className="mt-2 break-words text-lg font-semibold text-navy">{glossaryDisplayName(content, locale)}</h2>
        {content.regulation ? <p className="mt-1 text-sm font-semibold text-slate-600">{content.regulation.documentNumber} · {content.regulation.issuer}</p> : null}
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-textSecondary">{content[locale].shortDefinition}</p>
        <p className="mt-auto pt-3 text-xs text-slate-500">{content.domains.map((domain) => glossaryDomainLabels[locale][domain]).join(' · ')}</p>
      </Link>)}</div> : <p className="mt-6 rounded-2xl border border-dashed bg-white p-8 text-center text-textSecondary">{copy.empty}</p>}
    </Container></section>
  </main><Footer/></>;
}
