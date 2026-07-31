export const contributorPageSizes = [10, 20, 50] as const;
export type ContributorPageSize = (typeof contributorPageSizes)[number];
export const contributorSorts = ['updated-desc', 'updated-asc', 'title-asc', 'title-desc', 'version-desc', 'version-asc'] as const;
export type ContributorSort = (typeof contributorSorts)[number];
export type ContributorStatusFilter = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED' | undefined;
export type ContributorListParams = { page: number; pageSize: ContributorPageSize; query?: string; status?: ContributorStatusFilter; sort: ContributorSort };

const statusByUrl = { draft: 'DRAFT', 'in-review': 'IN_REVIEW', published: 'PUBLISHED', archived: 'ARCHIVED' } as const;
const sortSet = new Set<string>(contributorSorts);

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

export function parseContributorListParams(input: URLSearchParams | Record<string, string | string[] | undefined>): ContributorListParams {
  const get = (key: string) => input instanceof URLSearchParams ? input.get(key) : Array.isArray(input[key]) ? input[key]?.[0] ?? null : input[key] ?? null;
  const rawStatus = get('status');
  const rawSort = get('sort');
  const rawPageSize = positiveInteger(get('pageSize'), 10);
  const query = get('q')?.trim().slice(0, 100) || undefined;
  return {
    page: positiveInteger(get('page'), 1),
    pageSize: contributorPageSizes.includes(rawPageSize as ContributorPageSize) ? rawPageSize as ContributorPageSize : 10,
    query,
    status: rawStatus && rawStatus in statusByUrl ? statusByUrl[rawStatus as keyof typeof statusByUrl] : undefined,
    sort: rawSort && sortSet.has(rawSort) ? rawSort as ContributorSort : 'updated-desc',
  };
}

export function contributorListHref(basePath: string, params: ContributorListParams, changes: Partial<ContributorListParams> = {}) {
  const next = { ...params, ...changes };
  const search = new URLSearchParams();
  if (next.page > 1) search.set('page', String(next.page));
  if (next.pageSize !== 10) search.set('pageSize', String(next.pageSize));
  if (next.query) search.set('q', next.query);
  if (next.status) search.set('status', Object.entries(statusByUrl).find(([, value]) => value === next.status)?.[0] ?? '');
  if (next.sort !== 'updated-desc') search.set('sort', next.sort);
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
