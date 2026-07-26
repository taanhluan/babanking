import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('knowledge access repository publication filtering', () => {
  const source = readFileSync(
    new URL('./knowledge-access-repository.ts', import.meta.url),
    'utf8',
  );

  it('keeps unpublished content hidden from public VIEW listings', () => {
    expect(source).toContain(
      "publishedRevisionId: permission === 'VIEW' ? { not: null } : undefined",
    );
  });

  it('allows workflow permissions to evaluate unpublished content', () => {
    expect(source).toContain("const permission = options.permission ?? 'VIEW'");
    expect(source.indexOf("const permission = options.permission ?? 'VIEW'"))
      .toBeLessThan(source.indexOf('db.contentItem.findMany'));
  });
});
