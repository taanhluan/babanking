import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { Container } from '@/components/ui/Container';
import { glossaryCopy, glossaryDomainLabels, glossaryKindLabels, jurisdictionLabel, regulationStatusLabels, regulationStatusTone } from '@/components/glossary/glossary-copy';
import { getCurrentLocale } from '@/i18n/server';
import { requireContentSlugAccess } from '@/server/access-control/require-knowledge-access';
import { glossaryDisplayName, glossaryEntryLinkedSlugs, glossarySlugPattern } from '@/server/glossary/glossary-domain';
import { GlossaryRepository } from '@/server/glossary/glossary-repository';

function Paragraphs({ text }: { text: string }) {
  return <>{text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean).map((paragraph, index) => <p key={index} className="mt-3 whitespace-pre-line leading-7 text-slate-700">{paragraph}</p>)}</>;
}

export default async function GlossaryEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!glossarySlugPattern.test(slug)) notFound();
  const { user } = await requireContentSlugAccess('GLOSSARY_ENTRY', slug);
  const [locale, entry] = await Promise.all([getCurrentLocale(), GlossaryRepository.getPublishedBySlug(slug)]);
  if (!entry) notFound();
  const { content } = entry;
  const copy = glossaryCopy[locale];
  const text = content[locale];

  // Linked entries and Journeys are shown only when the reader is independently authorized for them.
  const linked = glossaryEntryLinkedSlugs(content);
  const [authorizedEntries, journeys] = await Promise.all([
    linked.length ? GlossaryRepository.listPublishedAuthorized(user.id) : Promise.resolve([]),
    GlossaryRepository.getAccessibleJourneyTitles(user.id, content.relatedJourneySlugs),
  ]);
  const related = authorizedEntries.filter((item) => content.relatedEntrySlugs.includes(item.slug));
  const supersededBy = content.regulation?.supersededBySlug ? authorizedEntries.find((item) => item.slug === content.regulation?.supersededBySlug) : undefined;
  const regulation = content.regulation;

  return <><Navbar/><main className="min-w-0 overflow-hidden">
    <header className="border-b bg-bgLight px-4 py-8 sm:px-6"><Container>
      <Link href="/glossary" className="text-sm font-semibold text-royalBlue">← {copy.back}</Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-royalBlue">{glossaryKindLabels[locale][content.kind]}{content.abbreviation ? ` · ${content.abbreviation}` : ''}</p>
      <h1 className="mt-2 break-words text-3xl font-semibold text-navy sm:text-4xl">{glossaryDisplayName(content, locale)}</h1>
      {locale === 'vi' && content.en.name !== content.vi.name ? <p className="mt-1 text-slate-600">{content.en.name}</p> : null}
      {locale === 'en' && content.en.name !== content.vi.name ? <p className="mt-1 text-slate-600" lang="vi">{content.vi.name}</p> : null}
      <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">{text.shortDefinition}</p>
      <div className="mt-4 flex flex-wrap gap-2">{content.domains.map((domain) => <span key={domain} className="rounded-full border bg-white px-3 py-1 text-xs font-semibold text-navy">{glossaryDomainLabels[locale][domain]}</span>)}</div>
    </Container></header>
    <section className="px-4 py-10 sm:px-6"><Container><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <article className="min-w-0">
        {content.aliases.length ? <p className="text-sm text-slate-600"><span className="font-semibold">{copy.aliases}:</span> {content.aliases.join(', ')}</p> : null}
        {text.body ? <section className="mt-6"><h2 className="text-xl font-semibold text-navy">{copy.details}</h2><Paragraphs text={text.body}/></section> : null}
        {text.baNotes ? <section className="mt-8 rounded-2xl border-l-4 border-royalBlue bg-blue-50/60 p-5"><h2 className="text-lg font-semibold text-navy">{copy.baNotes}</h2><Paragraphs text={text.baNotes}/></section> : null}
        {content.sources.length ? <section className="mt-8"><h2 className="text-xl font-semibold text-navy">{copy.sources}</h2><ul className="mt-3 space-y-2">{content.sources.map((source, index) => <li key={index} className="break-words text-sm text-slate-700">{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-royalBlue underline">{source.title}</a> : <span className="font-semibold">{source.title}</span>}{source.publisher ? ` — ${source.publisher}` : ''}</li>)}</ul></section> : null}
        {regulation ? <p className="mt-8 text-xs text-slate-500">{copy.disclaimer}</p> : null}
      </article>
      <aside className="min-w-0 space-y-5">
        {regulation ? <div className="rounded-2xl border bg-white p-5">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${regulationStatusTone[regulation.status]}`}>{regulationStatusLabels[locale][regulation.status]}</span>
          <dl className="mt-4 space-y-3 text-sm">
            {([[copy.documentNumber, regulation.documentNumber], [copy.issuer, regulation.issuer], [copy.jurisdiction, jurisdictionLabel(regulation.jurisdiction, locale)], [copy.issued, regulation.issuedDate], [copy.effective, regulation.effectiveDate]] as const).filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className="mt-0.5 break-words font-semibold text-navy">{value}</dd></div>)}
            {supersededBy ? <div><dt className="text-xs font-semibold uppercase text-slate-500">{copy.supersededBy}</dt><dd className="mt-0.5"><Link href={`/glossary/${supersededBy.slug}` as Route} className="font-semibold text-royalBlue underline">{glossaryDisplayName(supersededBy.content, locale)}</Link></dd></div> : null}
          </dl>
        </div> : null}
        {related.length ? <div className="rounded-2xl border bg-white p-5"><h2 className="font-semibold text-navy">{copy.related}</h2><ul className="mt-3 space-y-2">{related.map((item) => <li key={item.slug}><Link href={`/glossary/${item.slug}` as Route} className="text-sm font-semibold text-royalBlue hover:underline">{glossaryDisplayName(item.content, locale)}</Link><span className="ml-2 text-xs text-slate-500">{glossaryKindLabels[locale][item.content.kind]}</span></li>)}</ul></div> : null}
        {journeys.size ? <div className="rounded-2xl border bg-white p-5"><h2 className="font-semibold text-navy">{copy.journeys}</h2><ul className="mt-3 space-y-2">{[...journeys.entries()].map(([journeySlug, title]) => <li key={journeySlug}><Link href={`/banking-journeys/${journeySlug}` as Route} className="text-sm font-semibold text-royalBlue hover:underline">{title}</Link></li>)}</ul></div> : null}
        {content.lastVerifiedAt ? <p className="text-xs text-slate-500">{copy.lastVerified}: {content.lastVerifiedAt}</p> : null}
      </aside>
    </div></Container></section>
  </main><Footer/></>;
}
