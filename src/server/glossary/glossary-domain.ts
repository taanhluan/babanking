import { z } from 'zod';

export const glossaryKinds = ['TERM', 'REGULATION'] as const;
export type GlossaryKind = typeof glossaryKinds[number];

export const glossaryDomains = [
  'PAYMENTS', 'LENDING', 'CARDS', 'DEPOSITS', 'AML_KYC', 'RISK', 'TREASURY', 'TRADE_FINANCE',
  'DIGITAL_BANKING', 'DATA_REPORTING', 'SECURITY', 'ACCOUNTING', 'GENERAL',
] as const;
export type GlossaryDomain = typeof glossaryDomains[number];

export const regulationStatuses = ['IN_FORCE', 'AMENDED', 'SUPERSEDED', 'REPEALED'] as const;
export type RegulationStatus = typeof regulationStatuses[number];

export const glossarySlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slug = z.string().trim().min(2).max(120).regex(glossarySlugPattern);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

function uniqueList<T extends z.ZodTypeAny>(item: T, max: number, label: string) {
  return z.array(item).max(max).default([]).superRefine((values, context) => {
    if (new Set(values.map((value) => (typeof value === 'string' ? value.toLowerCase() : JSON.stringify(value)))).size !== values.length) {
      context.addIssue({ code: 'custom', message: `${label} must be unique.` });
    }
  });
}

const localeContent = z.object({
  name: z.string().trim().min(1).max(200),
  shortDefinition: z.string().trim().min(10).max(600),
  body: z.string().trim().max(20000).default(''),
  baNotes: z.string().trim().max(5000).default(''),
}).strict();

const source = z.object({
  title: z.string().trim().min(2).max(300),
  publisher: z.string().trim().max(200).optional(),
  url: z.string().trim().url().max(1000).refine((value) => value.startsWith('https://'), 'Source URLs must use https.').optional(),
}).strict();

const regulation = z.object({
  jurisdiction: z.string().trim().regex(/^(?:[A-Z]{2}|INTERNATIONAL)$/, 'Use an ISO country code (e.g. VN) or INTERNATIONAL.'),
  issuer: z.string().trim().min(2).max(200),
  documentNumber: z.string().trim().min(1).max(120),
  issuedDate: isoDate.optional(),
  effectiveDate: isoDate.optional(),
  status: z.enum(regulationStatuses),
  supersededBySlug: slug.optional(),
}).strict();

export const glossaryEntryContentSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.enum(glossaryKinds),
  abbreviation: z.string().trim().max(40).optional(),
  aliases: uniqueList(z.string().trim().min(1).max(120), 20, 'Aliases'),
  domains: uniqueList(z.enum(glossaryDomains), glossaryDomains.length, 'Domains').refine((values) => values.length > 0, 'Select at least one domain.'),
  en: localeContent,
  vi: localeContent,
  regulation: regulation.optional(),
  relatedEntrySlugs: uniqueList(slug, 30, 'Related entries'),
  relatedJourneySlugs: uniqueList(slug, 30, 'Related Journeys'),
  sources: z.array(source).max(20).default([]),
  lastVerifiedAt: isoDate.optional(),
}).strict().superRefine((value, context) => {
  if (value.kind === 'REGULATION' && !value.regulation) context.addIssue({ code: 'custom', path: ['regulation'], message: 'Regulation details are required for a regulation entry.' });
  if (value.kind === 'TERM' && value.regulation) context.addIssue({ code: 'custom', path: ['regulation'], message: 'Only regulation entries may include regulation details.' });
  const { issuedDate, effectiveDate, status, supersededBySlug } = value.regulation ?? {};
  if (issuedDate && effectiveDate && effectiveDate < issuedDate) context.addIssue({ code: 'custom', path: ['regulation', 'effectiveDate'], message: 'Effective date cannot be before the issued date.' });
  if (supersededBySlug && status !== 'SUPERSEDED') context.addIssue({ code: 'custom', path: ['regulation', 'supersededBySlug'], message: 'Only a superseded regulation may name its replacement.' });
});

export type GlossaryEntryContent = z.infer<typeof glossaryEntryContentSchema>;

export function parseGlossaryEntryContent(value: string | unknown): GlossaryEntryContent | null {
  try {
    return glossaryEntryContentSchema.safeParse(typeof value === 'string' ? JSON.parse(value) : value).data ?? null;
  } catch {
    return null;
  }
}

/** Links that point at the entry itself; rejected at save time because the slug lives on the ContentItem. */
export function glossarySelfReferences(content: GlossaryEntryContent, entrySlug: string) {
  return [...content.relatedEntrySlugs, content.regulation?.supersededBySlug].filter((value) => value === entrySlug);
}

export function glossaryEntryLinkedSlugs(content: GlossaryEntryContent) {
  return [...new Set([...content.relatedEntrySlugs, ...(content.regulation?.supersededBySlug ? [content.regulation.supersededBySlug] : [])])];
}

export function glossaryPreviewJson(content: GlossaryEntryContent) {
  return JSON.stringify({ kind: content.kind, title: content.en.name, summary: content.en.shortDefinition, domains: content.domains });
}

export function glossaryInitialContent(kind: GlossaryKind, name: string): GlossaryEntryContent {
  const placeholder = 'Definition pending author input before review.';
  return {
    schemaVersion: 1,
    kind,
    aliases: [],
    domains: ['GENERAL'],
    en: { name, shortDefinition: placeholder, body: '', baNotes: '' },
    vi: { name, shortDefinition: 'Định nghĩa đang chờ tác giả bổ sung trước khi review.', body: '', baNotes: '' },
    ...(kind === 'REGULATION' ? { regulation: { jurisdiction: 'VN', issuer: 'TBD', documentNumber: 'TBD', status: 'IN_FORCE' as const } } : {}),
    relatedEntrySlugs: [],
    relatedJourneySlugs: [],
    sources: [],
  };
}

export type GlossaryListEntry = { slug: string; content: GlossaryEntryContent };

export function glossaryDisplayName(content: GlossaryEntryContent, locale: 'en' | 'vi') {
  return content[locale].name || content.en.name;
}

/** First letter used by the A–Z index; non A–Z initials (digits, Vietnamese diacritics stripped) fall back sensibly. */
export function glossaryInitial(name: string) {
  const letter = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : '#';
}

export type GlossaryFilters = { q?: string; kind?: string; domain?: string; jurisdiction?: string; letter?: string };

export function filterGlossaryEntries(entries: GlossaryListEntry[], filters: GlossaryFilters, locale: 'en' | 'vi') {
  const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const q = fold(filters.q?.trim() ?? '');
  return entries
    .filter(({ content }) => !filters.kind || content.kind === filters.kind)
    .filter(({ content }) => !filters.domain || content.domains.includes(filters.domain as GlossaryDomain))
    .filter(({ content }) => !filters.jurisdiction || content.regulation?.jurisdiction === filters.jurisdiction)
    .filter(({ content }) => !filters.letter || glossaryInitial(glossaryDisplayName(content, locale)) === filters.letter)
    .filter(({ content }) => !q || fold([content.en.name, content.vi.name, content.abbreviation ?? '', ...content.aliases, content.regulation?.documentNumber ?? '', content.en.shortDefinition, content.vi.shortDefinition].join(' ')).includes(q))
    .sort((a, b) => glossaryDisplayName(a.content, locale).localeCompare(glossaryDisplayName(b.content, locale), locale));
}
