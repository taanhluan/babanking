import { describe, expect, it } from 'vitest';
import { contributorListHref, parseContributorListParams } from './contributor-list-params';

describe('contributor list parameters', () => {
  it('uses safe defaults', () => {
    expect(parseContributorListParams(new URLSearchParams())).toEqual({ page: 1, pageSize: 10, query: undefined, status: undefined, sort: 'updated-desc' });
  });

  it('normalizes valid values and trims/caps search', () => {
    const params = parseContributorListParams(new URLSearchParams({ page: '3', pageSize: '20', q: `  payment ${'x'.repeat(120)}`, status: 'in-review', sort: 'title-asc' }));
    expect(params).toEqual({ page: 3, pageSize: 20, query: `payment ${'x'.repeat(120)}`.slice(0, 100), status: 'IN_REVIEW', sort: 'title-asc' });
  });

  it('falls back for invalid values', () => {
    expect(parseContributorListParams(new URLSearchParams({ page: '-2', pageSize: '15', q: '  ', status: 'unknown', sort: 'updatedAt' }))).toEqual({ page: 1, pageSize: 10, query: undefined, status: undefined, sort: 'updated-desc' });
  });
});

describe('contributor list URLs', () => {
  const params = { page: 2, pageSize: 20 as const, query: 'payment rules', status: 'IN_REVIEW' as const, sort: 'title-asc' as const };

  it('preserves state and safely encodes query values', () => {
    expect(contributorListHref('/en/contributor', params, { page: 3 })).toBe('/en/contributor?page=3&pageSize=20&q=payment+rules&status=in-review&sort=title-asc');
  });

  it('supports clearing state through the base path', () => {
    expect(contributorListHref('/en/contributor', { ...params, query: undefined, status: undefined, sort: 'updated-desc', pageSize: 10, page: 1 })).toBe('/en/contributor');
  });
});
