import Link from 'next/link';
import type { ReactNode } from 'react';
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

type GenericBlock = {
  id?: string;
  blockType: string;
  payload: Record<string, unknown>;
};

type GenericSection = {
  id?: string;
  key?: string;
  title: string;
  order?: number;
  blocks: GenericBlock[];
};

type GenericModule = {
  id?: string;
  key?: string;
  title: string;
  order?: number;
  sections: GenericSection[];
};

function genericModules(value: unknown): GenericModule[] | null {
  if (!Array.isArray(value)) return null;
  const valid = value.every((module) => module && typeof module === 'object'
    && typeof (module as GenericModule).title === 'string'
    && Array.isArray((module as GenericModule).sections)
    && (module as GenericModule).sections.every((section) => section && typeof section === 'object'
      && typeof section.title === 'string'
      && Array.isArray(section.blocks)
      && section.blocks.every((block) => block && typeof block === 'object'
        && typeof block.blockType === 'string'
        && block.payload && typeof block.payload === 'object' && !Array.isArray(block.payload))));
  return valid ? value as GenericModule[] : null;
}

function ordered<T extends { order?: number }>(items: T[]) {
  return [...items].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

function scalar(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : '';
}

function richText(value: unknown) {
  if (typeof value !== 'string') return null;
  const text = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text || null;
}

function payloadText(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = richText(payload[key]);
    if (value) return value;
  }
  return null;
}

function isPrivilegedPayloadKey(key: string) {
  return /^(storageKey|signedUrl|secret|token|credentials?|authorization)$/i.test(key);
}

function GenericBlockView({ block }: { block: GenericBlock }): ReactNode {
  const { payload } = block;
  const type = block.blockType;
  const text = payloadText(payload, ['text', 'content', 'description', 'message']);
  if (type === 'RICH_TEXT') return text ? <p className="leading-7 text-textSecondary">{text}</p> : null;
  if (type === 'CHECKLIST') {
    const items = strings(payload.items);
    return items ? <List items={items} /> : null;
  }
  if (type === 'TABLE' && Array.isArray(payload.columns) && Array.isArray(payload.rows)) {
    const columns = payload.columns.map(scalar);
    const rows = payload.rows.filter(Array.isArray) as unknown[][];
    return <div className="overflow-x-auto"><table className="w-full min-w-[560px] border-collapse text-left text-sm">
      <thead><tr>{columns.map((column, index) => <th key={index} className="border border-slate-200 bg-slate-50 p-3">{column}</th>)}</tr></thead>
      <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="border border-slate-200 p-3">{scalar(cell)}</td>)}</tr>)}</tbody>
    </table></div>;
  }
  if (type === 'API_REFERENCE') {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="font-mono text-sm font-semibold">{scalar(payload.method)} {scalar(payload.path)}</p>
      {text ? <p className="mt-2 text-sm text-textSecondary">{text}</p> : null}
    </div>;
  }
  if (type === 'CODE') {
    const code = scalar(payload.code) || scalar(payload.content);
    return code ? <pre className="overflow-x-auto rounded-xl bg-navy p-4 text-sm text-white"><code>{code}</code></pre> : null;
  }
  if (type === 'CALLOUT') {
    return <aside className="rounded-xl border border-gold bg-goldPale p-4">
      {typeof payload.title === 'string' ? <h4 className="font-semibold">{payload.title}</h4> : null}
      {text ? <p className="mt-1 text-sm">{text}</p> : null}
    </aside>;
  }
  const entries = Object.entries(payload).flatMap(([key, value]) => {
    if (isPrivilegedPayloadKey(key)) return [];
    const valueText = scalar(value);
    const values = strings(value);
    if (valueText) return [[key, valueText] as const];
    if (values) return [[key, values.join(', ')] as const];
    return [];
  });
  return entries.length ? <dl className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[180px_1fr]">
    {entries.map(([key, value]) => <div key={key} className="contents"><dt className="font-semibold">{humanize(key)}</dt><dd className="text-textSecondary">{value}</dd></div>)}
  </dl> : null;
}

function GenericModules({ modules }: { modules: GenericModule[] }) {
  return <div className="space-y-12">{ordered(modules).map((module, moduleIndex) => <section key={module.id ?? module.key ?? moduleIndex}>
    <h2 className="text-3xl font-semibold text-textPrimary">{module.title}</h2>
    <div className="mt-6 space-y-8">{ordered(module.sections).map((section, sectionIndex) => <div key={section.id ?? section.key ?? sectionIndex}>
      <h3 className="text-xl font-semibold text-textPrimary">{section.title}</h3>
      <div className="mt-4 space-y-4">{section.blocks.map((block, blockIndex) => <GenericBlockView key={block.id ?? blockIndex} block={block} />)}</div>
    </div>)}</div>
  </section>)}</div>;
}

/** Renders only a body retrieved from Neon after server-side authorization. */
export function DatabaseArticle({ content }: { content: PublishedContent }) {
  const modules = genericModules(content.body.modules);
  const entries = Object.entries(content.body).filter(([key]) => !['title', 'summary', 'slug', 'contentType', 'schemaVersion', 'metadata', 'modules', 'keywords', 'relatedJourneySlugs', 'relatedPracticeSlugs', 'relatedCaseStudySlugs', 'previousLevelSlug', 'nextLevelSlug'].includes(key));
  return <>
    <ContentHero eyebrow={labelFor(content.type)} title={content.title} summary={content.summary} parentLabel={labelFor(content.type)} parentHref={`/${routeFor(content.type)}`} />
    <section className="px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><KnowledgeActions type={content.type} slug={content.slug} />{modules ? <div className="mt-10"><GenericModules modules={modules} /></div> : <div className="mt-8 space-y-10">{entries.map(([key, value]) => {
      if (typeof value === 'string') return <ContentSection key={key} id={key} title={humanize(key)}><p>{value}</p></ContentSection>;
      const list = strings(value); if (list) return <ContentSection key={key} id={key} title={humanize(key)}><List items={list} /></ContentSection>;
      const cards = objectCards(value); if (cards) return <ContentSection key={key} id={key} title={humanize(key)}><div className="grid gap-4 sm:grid-cols-2">{cards.map((card, index) => <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">{typeof card.title === 'string' ? <h3 className="font-semibold text-textPrimary">{card.title}</h3> : null}{typeof card.description === 'string' ? <p className="mt-2 text-sm leading-6 text-textSecondary">{card.description}</p> : null}</div>)}</div></ContentSection>;
      return null;
    })}</div>}</div></section>
  </>;
}
