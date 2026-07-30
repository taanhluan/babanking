import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { EmptyState, StatusLabel, WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { getCurrentLocale } from '@/i18n/server';
import { getLocalizedPath } from '@/i18n/routing';
import { formatDate } from '@/i18n/format';
import { listContributorRevisions, type ContributorListParams } from '@/server/contributor/contributor-list';
import { contributorListHref, parseContributorListParams } from '@/server/contributor/contributor-list-params';

const typeLabels = { BANKING_JOURNEY: 'Banking Journey', BA_PRACTICE: 'BA Practice', CASE_STUDY: 'Case Study', CAREER_LEVEL: 'Career Level' } as const;
const statusLabels: Record<string, string> = { DRAFT: 'Draft', IN_REVIEW: 'In Review', PUBLISHED: 'Published', ARCHIVED: 'Archived', CHANGES_REQUESTED: 'Changes Requested', REJECTED: 'Rejected' };

function pageNumbers(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const values = new Set([1, total, current, current - 1, current + 1].filter((page) => page > 0 && page <= total));
  const result: Array<number | 'ellipsis'> = [];
  [...values].sort((a, b) => a - b).forEach((page, index, pages) => {
    if (index > 0 && page - pages[index - 1] > 1) result.push('ellipsis');
    result.push(page);
  });
  return result;
}

function ListToolbar({ params, basePath }: { params: ContributorListParams; basePath: string }) {
  const hasFilters = Boolean(params.query || params.status || params.sort !== 'updated-desc' || params.pageSize !== 10);
  return <form method="get" className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
    <label className="block text-sm font-semibold">Search contributions<input name="q" defaultValue={params.query} maxLength={100} placeholder="Search by slug or type" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal" /></label>
    <label className="block text-sm font-semibold">Filter by status<select name="status" defaultValue={params.status ? ({ DRAFT: 'draft', IN_REVIEW: 'in-review', PUBLISHED: 'published', ARCHIVED: 'archived' } as const)[params.status] : ''} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"><option value="">All statuses</option><option value="draft">Draft</option><option value="in-review">In Review</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
    <label className="block text-sm font-semibold">Sort contributions<select name="sort" defaultValue={params.sort} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"><option value="updated-desc">Recently updated</option><option value="updated-asc">Oldest updated</option><option value="title-asc">Title A–Z</option><option value="title-desc">Title Z–A</option><option value="version-desc">Version high to low</option><option value="version-asc">Version low to high</option></select></label>
    <input type="hidden" name="page" value="1" /><label className="block text-sm font-semibold">Results per page<select name="pageSize" defaultValue={params.pageSize} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label>
    <div className="flex gap-2 sm:col-span-4"><button className="min-h-11 rounded-xl bg-royalBlue px-4 font-semibold text-white">Apply</button>{hasFilters ? <Link href={basePath} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 font-semibold text-navy">Clear filters</Link> : null}</div>
  </form>;
}

function Pagination({ params, page, totalPages, basePath }: { params: ContributorListParams; page: number; totalPages: number; basePath: string }) {
  if (totalPages <= 1) return null;
  return <nav aria-label="Contributor list pagination" className="mt-6 flex flex-wrap items-center justify-center gap-2">
    {page > 1 ? <Link href={contributorListHref(basePath, params, { page: page - 1 })} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-3 font-semibold">Previous</Link> : <span aria-disabled="true" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-3 text-slate-400">Previous</span>}
    {pageNumbers(page, totalPages).map((value, index) => value === 'ellipsis' ? <span key={`ellipsis-${index}`} className="px-1" aria-hidden="true">…</span> : <Link key={value} href={contributorListHref(basePath, params, { page: value })} aria-current={value === page ? 'page' : undefined} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border px-3 font-semibold ${value === page ? 'border-royalBlue bg-royalBlue text-white' : 'border-slate-300 text-navy'}`}>{value}</Link>)}
    {page < totalPages ? <Link href={contributorListHref(basePath, params, { page: page + 1 })} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-3 font-semibold">Next</Link> : <span aria-disabled="true" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-3 text-slate-400">Next</span>}
  </nav>;
}

export default async function ContributorPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole('CONTRIBUTOR');
  const locale = await getCurrentLocale();
  const params = parseContributorListParams(await searchParams ?? {});
  const basePath = getLocalizedPath('/contributor', locale);
  const result = await listContributorRevisions({ ...params, actorId: user.id, isAdmin: user.role === 'ADMIN' });
  const displayPage = result.totalPages ? Math.min(result.page, result.totalPages) : 1;
  const first = result.total ? (displayPage - 1) * result.pageSize + 1 : 0;
  const last = result.total ? Math.min(displayPage * result.pageSize, result.total) : 0;
  const activeFilter = Boolean(params.query || params.status);
  return <>
    <WorkspaceTitle eyebrow="Contributor Workspace" title="My Contributions" description="Create structured drafts, respond to review feedback, and maintain published knowledge through versioned revisions." />
    <Link href={getLocalizedPath('/contributor/content/new', locale)} className="inline-flex min-h-11 items-center rounded-xl bg-royalBlue px-4 font-semibold text-white">Create New Content</Link>
    <ListToolbar params={params} basePath={basePath} />
    <p className="mt-5 text-sm text-slate-600" role="status">{result.total ? `Showing ${first}–${last} of ${result.total}` : activeFilter ? 'No contributions match the current search or filters.' : 'Showing 0 results'}</p>
    {result.items.length ? <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid"><span>Content</span><span>Type</span><span>Version</span><span>Status</span><span>Updated</span><span>Actions</span></div>{result.items.map((revision) => <article key={revision.id} className="grid gap-3 border-b border-slate-200 p-4 last:border-b-0 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_auto] md:items-center md:gap-4"><div className="min-w-0"><h2 className="break-words font-semibold text-navy">{revision.contentItem.slug.replaceAll('-', ' ')}</h2>{revision.reviewNote && ['IN_REVIEW', 'CHANGES_REQUESTED'].includes(revision.status) ? <p className="mt-1 line-clamp-2 text-sm text-slate-600">{revision.reviewNote}</p> : null}</div><p className="text-sm text-slate-600">{typeLabels[revision.contentItem.type]}</p><p className="text-sm text-slate-600">Version {revision.version}</p><div><StatusLabel status={statusLabels[revision.status] ?? revision.status} /></div><p className="text-sm text-slate-600">{formatDate(revision.updatedAt, locale)}</p><div><Link href={getLocalizedPath(`/contributor/content/${revision.contentItemId}/preview`, locale)} className="inline-flex min-h-11 items-center rounded-xl px-3 font-semibold text-royalBlue">Preview</Link>{['DRAFT', 'CHANGES_REQUESTED'].includes(revision.status) ? <Link href={getLocalizedPath(`/contributor/content/${revision.contentItemId}/edit`, locale)} className="ml-1 inline-flex min-h-11 items-center rounded-xl px-3 font-semibold text-royalBlue">Edit</Link> : null}</div></article>)}</div> : <div className="mt-3"><EmptyState title={activeFilter ? 'No matching contributions' : 'No contributions yet'} description={activeFilter ? 'Try clearing your search or filters.' : 'Create a structured draft to begin the review workflow.'} />{activeFilter ? <Link href={basePath} className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 font-semibold">Clear filters</Link> : null}</div>}
    <Pagination params={params} page={displayPage} totalPages={result.totalPages} basePath={basePath} />
  </>;
}
