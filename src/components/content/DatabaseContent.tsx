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

function CmsBlock({ block }: { block: NonNullable<PublishedContent['modules']>[number]['sections'][number]['blocks'][number] }) {
  const items = strings(block.payload.items);
  const cards = objectCards(block.payload.items);
  const groups = objectCards(block.payload.groups);
  const columns = strings(block.payload.columns);
  const rows = Array.isArray(block.payload.rows)
    ? block.payload.rows.filter((row): row is string[] => strings(row) !== null)
    : null;

  if (block.blockType === 'RICH_TEXT' && typeof block.payload.text === 'string') {
    return <p className="leading-7 text-textSecondary">{block.payload.text}</p>;
  }
  if (block.blockType === 'TABLE' && columns && rows) {
    return <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead><tr>{columns.map((column) => <th key={column} className="border-b border-slate-300 px-3 py-2 font-semibold">{column}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="border-b border-slate-200 px-3 py-3 align-top text-textSecondary">{cell}</td>)}</tr>)}</tbody></table></div>;
  }
  if (items) return <List items={items} />;
  if (cards) {
    return <div className="grid gap-4 sm:grid-cols-2">{cards.map((card, index) => <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">{typeof card.title === 'string' ? <h4 className="font-semibold text-textPrimary">{card.title}</h4> : null}{typeof card.description === 'string' ? <p className="mt-2 text-sm leading-6 text-textSecondary">{card.description}</p> : null}</div>)}</div>;
  }
  if (groups) {
    return <div className="grid gap-4 sm:grid-cols-2">{groups.map((group, index) => {
      const groupItems = strings(group.items) ?? strings(group.slugs);
      return <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">{typeof group.title === 'string' ? <h4 className="font-semibold text-textPrimary">{group.title}</h4> : null}{groupItems ? <div className="mt-3"><List items={groupItems} /></div> : null}</div>;
    })}</div>;
  }
  return null;
}

/** Renders only a body retrieved from Neon after server-side authorization. */
export function DatabaseArticle({ content }: { content: PublishedContent }) {
  const entries = Object.entries(content.body).filter(([key]) => !['title', 'summary', 'slug', 'contentType', 'keywords', 'relatedJourneySlugs', 'relatedPracticeSlugs', 'relatedCaseStudySlugs', 'previousLevelSlug', 'nextLevelSlug', 'migration'].includes(key));
  return <>
    <ContentHero eyebrow={labelFor(content.type)} title={content.title} summary={content.summary} parentLabel={labelFor(content.type)} parentHref={`/${routeFor(content.type)}`} />
    <section className="px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><KnowledgeActions type={content.type} slug={content.slug} />{content.modules?.length ? <div className="mt-8 space-y-12">{content.modules.map((module) => <section key={module.id}><h2 className="text-2xl font-semibold text-textPrimary">{module.title}</h2><div className="mt-6 space-y-8">{module.sections.map((section) => <div key={section.id} id={section.stableKey}><h3 className="mb-4 text-lg font-semibold text-textPrimary">{section.title}</h3><div className="space-y-4">{section.blocks.map((block) => <CmsBlock key={block.id} block={block} />)}</div></div>)}</div></section>)}</div> : <div className="mt-8 space-y-10">{entries.map(([key, value]) => {
      if (typeof value === 'string') return <ContentSection key={key} id={key} title={humanize(key)}><p>{value}</p></ContentSection>;
      const list = strings(value); if (list) return <ContentSection key={key} id={key} title={humanize(key)}><List items={list} /></ContentSection>;
      const cards = objectCards(value); if (cards) return <ContentSection key={key} id={key} title={humanize(key)}><div className="grid gap-4 sm:grid-cols-2">{cards.map((card, index) => <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">{typeof card.title === 'string' ? <h3 className="font-semibold text-textPrimary">{card.title}</h3> : null}{typeof card.description === 'string' ? <p className="mt-2 text-sm leading-6 text-textSecondary">{card.description}</p> : null}</div>)}</div></ContentSection>;
      return null;
    })}</div>}</div></section>
  </>;
}
