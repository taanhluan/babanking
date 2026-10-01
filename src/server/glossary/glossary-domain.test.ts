import { describe, expect, it } from 'vitest';
import { filterGlossaryEntries, glossaryEntryContentSchema, glossaryInitial, glossaryInitialContent, glossarySelfReferences, parseGlossaryEntryContent, type GlossaryEntryContent } from './glossary-domain';

const term = (overrides: Partial<GlossaryEntryContent> = {}): GlossaryEntryContent => glossaryEntryContentSchema.parse({
  schemaVersion: 1,
  kind: 'TERM',
  abbreviation: 'KYC',
  aliases: ['Know your customer'],
  domains: ['AML_KYC'],
  en: { name: 'Know Your Customer', shortDefinition: 'Process to verify the identity of a customer before onboarding.' },
  vi: { name: 'Định danh khách hàng', shortDefinition: 'Quy trình xác minh danh tính khách hàng trước khi mở quan hệ.' },
  relatedEntrySlugs: ['ekyc-circular'],
  relatedJourneySlugs: ['customer-onboarding'],
  ...overrides,
});

const regulation = { jurisdiction: 'VN', issuer: 'NHNN', documentNumber: '16/2020/TT-NHNN', issuedDate: '2020-12-04', effectiveDate: '2021-03-05', status: 'AMENDED' };

describe('glossary entry content schema', () => {
  it('accepts a bilingual term with defaults applied', () => {
    const value = term();
    expect(value.en.body).toBe('');
    expect(value.sources).toEqual([]);
  });

  it('requires regulation details only for regulation entries', () => {
    expect(glossaryEntryContentSchema.safeParse({ ...term(), kind: 'REGULATION' }).success).toBe(false);
    expect(glossaryEntryContentSchema.safeParse({ ...term(), kind: 'REGULATION', regulation }).success).toBe(true);
    expect(glossaryEntryContentSchema.safeParse({ ...term(), regulation }).success).toBe(false);
  });

  it('rejects inconsistent regulation dates and replacement links', () => {
    expect(glossaryEntryContentSchema.safeParse({ ...term(), kind: 'REGULATION', regulation: { ...regulation, effectiveDate: '2019-01-01' } }).success).toBe(false);
    expect(glossaryEntryContentSchema.safeParse({ ...term(), kind: 'REGULATION', regulation: { ...regulation, supersededBySlug: 'new-circular' } }).success).toBe(false);
    expect(glossaryEntryContentSchema.safeParse({ ...term(), kind: 'REGULATION', regulation: { ...regulation, status: 'SUPERSEDED', supersededBySlug: 'new-circular' } }).success).toBe(true);
  });

  it('rejects unknown fields, non-https sources, duplicates and empty domains', () => {
    expect(glossaryEntryContentSchema.safeParse({ ...term(), authorId: 'x' }).success).toBe(false);
    expect(glossaryEntryContentSchema.safeParse({ ...term(), sources: [{ title: 'Source', url: 'http://example.com' }] }).success).toBe(false);
    expect(glossaryEntryContentSchema.safeParse({ ...term(), sources: [{ title: 'Source', url: 'javascript:alert(1)' }] }).success).toBe(false);
    expect(glossaryEntryContentSchema.safeParse({ ...term(), relatedJourneySlugs: ['lending', 'lending'] }).success).toBe(false);
    expect(glossaryEntryContentSchema.safeParse({ ...term(), domains: [] }).success).toBe(false);
  });

  it('parses JSON safely and detects self references', () => {
    expect(parseGlossaryEntryContent('{bad')).toBeNull();
    expect(parseGlossaryEntryContent(JSON.stringify(term()))?.kind).toBe('TERM');
    expect(glossarySelfReferences(term({ relatedEntrySlugs: ['kyc'] }), 'kyc')).toEqual(['kyc']);
  });

  it('produces valid initial drafts for both kinds', () => {
    expect(glossaryEntryContentSchema.safeParse(glossaryInitialContent('TERM', 'Escrow')).success).toBe(true);
    expect(glossaryEntryContentSchema.safeParse(glossaryInitialContent('REGULATION', 'Circular 16')).success).toBe(true);
  });
});

describe('glossary filtering', () => {
  const entries = [
    { slug: 'kyc', content: term() },
    { slug: 'ekyc-circular', content: term({ kind: 'REGULATION', abbreviation: undefined, aliases: [], domains: ['DIGITAL_BANKING'], regulation: { ...regulation, status: 'AMENDED' }, en: { name: 'eKYC Circular', shortDefinition: 'Rules for electronic customer identification.', body: '', baNotes: '' }, vi: { name: 'Thông tư eKYC', shortDefinition: 'Quy định định danh khách hàng điện tử.', body: '', baNotes: '' } }) },
  ];

  it('searches across names, aliases, document numbers and Vietnamese without diacritics', () => {
    expect(filterGlossaryEntries(entries, { q: 'know your' }, 'en').map((entry) => entry.slug)).toEqual(['kyc']);
    expect(filterGlossaryEntries(entries, { q: '16/2020' }, 'en').map((entry) => entry.slug)).toEqual(['ekyc-circular']);
    expect(filterGlossaryEntries(entries, { q: 'dinh danh' }, 'vi')).toHaveLength(2);
  });

  it('filters by kind, domain, jurisdiction and initial letter', () => {
    expect(filterGlossaryEntries(entries, { kind: 'REGULATION' }, 'en').map((entry) => entry.slug)).toEqual(['ekyc-circular']);
    expect(filterGlossaryEntries(entries, { domain: 'AML_KYC' }, 'en').map((entry) => entry.slug)).toEqual(['kyc']);
    expect(filterGlossaryEntries(entries, { jurisdiction: 'VN' }, 'en').map((entry) => entry.slug)).toEqual(['ekyc-circular']);
    expect(filterGlossaryEntries(entries, { letter: 'K' }, 'en').map((entry) => entry.slug)).toEqual(['kyc']);
    expect(glossaryInitial('Định danh')).toBe('D');
    expect(glossaryInitial('3-D Secure')).toBe('#');
  });
});
