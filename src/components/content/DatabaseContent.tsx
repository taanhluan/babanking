import Link from 'next/link';
import { ContentHero, ContentSection, List } from '@/components/content/Editorial';
import { KnowledgeActions } from '@/components/member/KnowledgeActions';
import type { ContentPreview, PublishedContent } from '@/lib/repository';

const routeFor = (type: PublishedContent['type']) => ({
  BANKING_JOURNEY: 'banking-journeys', BA_PRACTICE: 'ba-practice', CASE_STUDY: 'case-studies', CAREER_LEVEL: 'career-roadmap',
}[type]);

const labelFor = (type: PublishedContent['type']) => ({
  BANKING_JOURNEY: 'Banking Journeys', BA_PRACTICE: 'BA Practice', CASE_STUDY: 'Case Studies', CAREER_LEVEL: 'Career Roadmap',
}[type]);

export function DatabaseContentLibrary({ items }: { items: ContentPreview[] }) {
  if (!items.length) return <p className="rounded-2xl border border-dashed p-8 text-center">No knowledge scope has been assigned to this section.</p>;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <Link key={item.id} href={`/${routeFor(item.type)}/${item.slug}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-royalBlue"><p className="text-xs font-semibold uppercase tracking-wide text-royalBlue">{labelFor(item.type)}</p><h2 className="mt-2 text-xl font-semibold text-textPrimary">{item.title}</h2><p className="mt-3 text-sm leading-6 text-textSecondary">{item.summary}</p><span className="mt-5 inline-flex text-sm font-semibold text-royalBlue">Open authorized content →</span></Link>)}</div>;
}

function humanize(key: string) { return key.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').replace(/^./, (value) => value.toUpperCase()); }

function strings(value: unknown): string[] | null { return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : null; }

function objectCards(value: unknown): Array<Record<string, unknown>> | null {
  return Array.isArray(value) && value.every((entry) => entry && typeof entry === 'object' && !Array.isArray(entry)) ? value as Array<Record<string, unknown>> : null;
}

/** Renders only a body retrieved from Neon after server-side authorization. */
export function DatabaseArticle({ content }: { content: PublishedContent }) {
  const entries = Object.entries(content.body).filter(([key]) => !['title', 'summary', 'slug', 'contentType', 'keywords', 'relatedJourneySlugs', 'relatedPracticeSlugs', 'relatedCaseStudySlugs', 'previousLevelSlug', 'nextLevelSlug'].includes(key));
  return <>
    <ContentHero eyebrow={labelFor(content.type)} title={content.title} summary={content.summary} parentLabel={labelFor(content.type)} parentHref={`/${routeFor(content.type)}`} />
    <section className="px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><KnowledgeActions type={content.type} slug={content.slug} /><div className="mt-8 space-y-10">{entries.map(([key, value]) => {
      if (typeof value === 'string') return <ContentSection key={key} id={key} title={humanize(key)}><p>{value}</p></ContentSection>;
      const list = strings(value); if (list) return <ContentSection key={key} id={key} title={humanize(key)}><List items={list} /></ContentSection>;
      const cards = objectCards(value); if (cards) return <ContentSection key={key} id={key} title={humanize(key)}><div className="grid gap-4 sm:grid-cols-2">{cards.map((card, index) => <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">{typeof card.title === 'string' ? <h3 className="font-semibold text-textPrimary">{card.title}</h3> : null}{typeof card.description === 'string' ? <p className="mt-2 text-sm leading-6 text-textSecondary">{card.description}</p> : null}</div>)}</div></ContentSection>;
      return null;
    })}</div></div></section>
  </>;
}
