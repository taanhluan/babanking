import Link from 'next/link';
import type { ContentType, RevisionStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { WorkspaceTitle, EmptyState, StatusLabel } from '@/components/workspace/WorkspaceShell';
import { getAccessibleContentIds } from '@/server/access-control/knowledge-access-repository';
import { reviewQueueContentTypeList } from '@/server/review/generic-review-workflow';

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'in-review', label: 'Needs review', status: 'IN_REVIEW' },
  { value: 'changes-requested', label: 'Changes requested', status: 'CHANGES_REQUESTED' },
  { value: 'published', label: 'Published', status: 'PUBLISHED' },
  { value: 'rejected', label: 'Rejected', status: 'REJECTED' },
] as const;
const queueContentTypes: ContentType[] = [...reviewQueueContentTypeList, 'BA_DOCUMENT'];
const typeOptions = [
  { value: '', label: 'All content types' },
  ...queueContentTypes.map((type) => ({ value: type.toLowerCase().replaceAll('_', '-'), label: type.replaceAll('_', ' '), type })),
] as const;
const priority: Record<RevisionStatus, number> = { IN_REVIEW: 0, CHANGES_REQUESTED: 1, PUBLISHED: 2, REJECTED: 3, DRAFT: 4, ARCHIVED: 5 };
const rowTone: Partial<Record<RevisionStatus, string>> = {
  IN_REVIEW: 'border-l-4 border-l-amber-500 bg-amber-50/70',
  CHANGES_REQUESTED: 'border-l-4 border-l-orange-400 bg-orange-50/60',
  REJECTED: 'border-l-4 border-l-red-400 bg-red-50/50',
  PUBLISHED: 'border-l-4 border-l-emerald-400 bg-emerald-50/30',
};

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ status?: string; type?: string }> }) {
  const user = await requireRole('REVIEWER');
  const params = await searchParams;
  const statusOption = statusOptions.find((option) => option.value === params.status);
  const typeOption = typeOptions.find((option) => option.value === params.type);
  const selectedStatus = statusOption && 'status' in statusOption ? statusOption.status : undefined;
  const selectedType = typeOption && 'type' in typeOption ? typeOption.type : undefined;
  const [contentIds, journeyIds] = await Promise.all([
    getAccessibleContentIds(user.id, { permission: 'REVIEW' }),
    getAccessibleContentIds(user.id, { type: 'BANKING_JOURNEY', permission: 'REVIEW' }),
  ]);
  const statuses: RevisionStatus[] = selectedStatus ? [selectedStatus] : ['IN_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'PUBLISHED'];
  const contentTypes = selectedType ? [selectedType] : queueContentTypes;
  const revisions = await db.contentRevision.findMany({
    where: {
      OR: [
        { contentItemId: { in: contentIds }, contentItem: { type: { in: contentTypes } } },
        ...(contentTypes.includes('BA_DOCUMENT') ? [{ contentItem: { type: 'BA_DOCUMENT' as ContentType, primaryJourneyContentItemId: { in: journeyIds } } }] : []),
      ],
      authorId: { not: user.id },
      status: { in: statuses },
    },
    include: { contentItem: true, author: { select: { name: true } } },
    orderBy: { submittedAt: 'desc' },
    take: 100,
  });
  revisions.sort((a, b) => priority[a.status] - priority[b.status] || (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0));
  const hasFilter = Boolean(selectedStatus || selectedType);

  return <>
    <WorkspaceTitle eyebrow="Content Governance" title="Review Queue" description="Review submitted revisions within your assigned knowledge scopes." />
    <form method="get" className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="text-sm font-semibold text-navy">Status<select name="status" defaultValue={selectedStatus ? params.status : ''} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"><option value="">All statuses</option>{statusOptions.slice(1).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="text-sm font-semibold text-navy">Content type<select name="type" defaultValue={selectedType ? params.type : ''} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"><option value="">All content types</option>{typeOptions.slice(1).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <div className="flex gap-2"><button className="min-h-11 rounded-xl bg-royalBlue px-4 font-semibold text-white">Apply filters</button>{hasFilter ? <Link href="/review" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 font-semibold text-navy">Clear</Link> : null}</div>
    </form>
    {revisions.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50"><tr><Th>Content</Th><Th>Contributor</Th><Th>Version</Th><Th>Status</Th><Th>Action</Th></tr></thead><tbody>{revisions.map((revision) => <tr key={revision.id} className={`border-t border-slate-200 ${rowTone[revision.status] ?? ''}`}><Td><span className="capitalize font-medium text-navy">{revision.contentItem.slug.replaceAll('-', ' ')}</span><span className="block text-xs text-slate-500">{revision.contentItem.type.replaceAll('_', ' ')}</span></Td><Td>{revision.author?.name ?? 'Seed migration'}</Td><Td>{revision.version}</Td><Td><StatusLabel status={revision.status === 'IN_REVIEW' ? 'Needs review' : revision.status} /></Td><Td><Link href={`/review/${revision.id}`} className="font-semibold text-royalBlue">{revision.status === 'IN_REVIEW' ? 'Open review' : 'View revision'}</Link></Td></tr>)}</tbody></table></div> : <EmptyState title={hasFilter ? 'No matching revisions' : 'No authorized revisions in the queue'} description={hasFilter ? 'Try another status or content type.' : 'Only submissions within your active review scopes appear here.'} />}
  </>;
}

const Th = ({ children }: { children: React.ReactNode }) => <th className="px-4 py-3 font-semibold">{children}</th>;
const Td = ({ children }: { children: React.ReactNode }) => <td className="px-4 py-3">{children}</td>;
