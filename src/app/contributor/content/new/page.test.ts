import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('legacy Create New Content', () => {
  const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

  it('does not offer Banking Journey creation', () => {
    expect(source).not.toContain('<option value="BANKING_JOURNEY">');
  });

  it('directs Journey editors to the controlled Journey CMS', () => {
    expect(source).toContain('Admin → Contributor → Journey Content');
    expect(source).toContain('href="/admin/contributor/journeys"');
  });
});
