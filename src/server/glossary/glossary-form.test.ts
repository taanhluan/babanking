import { describe, expect, it } from 'vitest';
import { glossaryEntryContentSchema } from './glossary-domain';
import { formatGlossarySourceLines, glossaryContentFromForm, parseGlossarySourceLines } from './glossary-form';

function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) for (const item of [value].flat()) data.append(key, item);
  return data;
}

describe('glossary editor form mapping', () => {
  it('maps a regulation form into schema-valid content', () => {
    const content = glossaryContentFromForm(form({
      kind: 'REGULATION', abbreviation: '', aliases: 'eKYC circular, Thông tư 16\nThông tư 16',
      domains: ['AML_KYC', 'DIGITAL_BANKING', 'NOT_A_DOMAIN'],
      'en.name': 'Circular 16/2020', 'en.shortDefinition': 'Rules for opening payment accounts by electronic means.', 'en.body': '', 'en.baNotes': '',
      'regulation.jurisdiction': 'vn', 'regulation.issuer': 'NHNN', 'regulation.documentNumber': '16/2020/TT-NHNN', 'regulation.issuedDate': '2020-12-04', 'regulation.effectiveDate': '2021-03-05', 'regulation.status': 'AMENDED', 'regulation.supersededBySlug': '',
      relatedEntrySlugs: 'ekyc, kyc', relatedJourneySlugs: ['customer-onboarding'],
      sources: 'Official text | State Bank of Vietnam | https://example.gov.vn/doc\nInternal note',
      lastVerifiedAt: '2026-10-01',
    }));
    const parsed = glossaryEntryContentSchema.parse(content);
    expect(parsed.aliases).toEqual(['eKYC circular', 'Thông tư 16']);
    expect(parsed).not.toHaveProperty('vi');
    expect(parsed.domains).toEqual(['AML_KYC', 'DIGITAL_BANKING']);
    expect(parsed.regulation).toMatchObject({ jurisdiction: 'VN', status: 'AMENDED' });
    expect(parsed.regulation?.supersededBySlug).toBeUndefined();
    expect(parsed.sources).toEqual([{ title: 'Official text', publisher: 'State Bank of Vietnam', url: 'https://example.gov.vn/doc' }, { title: 'Internal note' }]);
  });

  it('includes Vietnamese text only when at least one Vietnamese field is filled', () => {
    const base = { kind: 'TERM', domains: ['GENERAL'], 'en.name': 'Escrow', 'en.shortDefinition': 'Funds held by the bank until agreed conditions are met.' };
    expect(glossaryContentFromForm(form({ ...base, 'vi.name': '', 'vi.shortDefinition': '' }))).not.toHaveProperty('vi');
    const content = glossaryEntryContentSchema.parse(glossaryContentFromForm(form({ ...base, 'vi.name': 'Ký quỹ', 'vi.shortDefinition': 'Ngân hàng giữ tiền cho tới khi đáp ứng điều kiện.' })));
    expect(content.vi?.name).toBe('Ký quỹ');
  });

  it('drops regulation details for terms and round-trips source lines', () => {
    const content = glossaryContentFromForm(form({ kind: 'TERM', 'regulation.issuer': 'NHNN' }));
    expect('regulation' in content).toBe(false);
    const sources = parseGlossarySourceLines('A | B | https://x.org\nC');
    expect(parseGlossarySourceLines(formatGlossarySourceLines(sources))).toEqual(sources);
  });
});
