import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateGlossaryStarter } from './glossary-starter';

const retailJourneys = ['customer-onboarding', 'payments-and-transfers', 'cards', 'deposits', 'lending', 'security-and-access', 'customer-service', 'wealth-and-investment', 'notification-and-engagement', 'personal-finance-management'];
const starter = JSON.parse(readFileSync(join(process.cwd(), 'content/glossary/banking-glossary-starter-v1.json'), 'utf8'));

describe('glossary starter content', () => {
  it('is schema-valid with unique slugs and resolvable entry links', () => {
    const file = validateGlossaryStarter(starter);
    expect(file.entries.length).toBeGreaterThan(40);
    expect(file.entries.some((entry) => entry.content.kind === 'REGULATION')).toBe(true);
  });

  it('has English and Vietnamese text, English-only aliases, valid Journey links and no placeholders or fabricated verification dates', () => {
    const file = validateGlossaryStarter(starter);
    for (const { slug, content } of file.entries) {
      for (const journey of content.relatedJourneySlugs) expect(retailJourneys, `${slug} → ${journey}`).toContain(journey);
      expect(content.regulation?.documentNumber, slug).not.toBe('TBD');
      expect(content.lastVerifiedAt, slug).toBeUndefined();
      expect(content.vi?.name, `${slug} Vietnamese name`).toBeTruthy();
      for (const alias of content.aliases) expect(alias, `${slug} alias`).toMatch(/^[\x20-\x7E]+$/);
    }
  });

  it('rejects duplicates, self links and unknown links', () => {
    const entry = starter.entries[0];
    expect(() => validateGlossaryStarter({ ...starter, entries: [entry, entry] })).toThrow(/Duplicate/);
    expect(() => validateGlossaryStarter({ ...starter, entries: [{ ...entry, content: { ...entry.content, relatedEntrySlugs: [entry.slug] } }] })).toThrow(/itself/);
    expect(() => validateGlossaryStarter({ ...starter, entries: [{ ...entry, content: { ...entry.content, relatedEntrySlugs: ['missing-entry'] } }] })).toThrow(/unknown entry missing-entry/);
    expect(() => validateGlossaryStarter({ ...starter, entries: [{ ...entry, content: { ...entry.content, relatedEntrySlugs: ['missing-entry'] } }] }, ['missing-entry'])).not.toThrow();
  });
});
