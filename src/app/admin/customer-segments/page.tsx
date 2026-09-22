import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { WorkspaceTitle, StatusLabel } from '@/components/workspace/WorkspaceShell';
import { CustomerSegmentRepository } from '@/server/customer-segment/customer-segment-repository';
import { journeySegments } from '@/server/journey-segments';
import { createCustomerSegmentAction } from './actions';

export default async function CustomerSegmentsPage() {
  await requireRole('ADMIN');
  const [records, assignments] = await Promise.all([
    CustomerSegmentRepository.listForCms(),
    CustomerSegmentRepository.getPublishedJourneyAssignments(),
  ]);
  return <>
    <WorkspaceTitle eyebrow="Administration · Governed Content" title="Customer Segments" description="Manage segment landing content and published Journey classification through independent review." />
    <div className="space-y-4">{journeySegments.map((segment) => {
      const record = records.find((item) => item.slug === segment.slug);
      const status = record?.revisions[0]?.status ?? (record?.publishedRevision ? 'PUBLISHED' : 'NOT_STARTED');
      const journeyCount = [...assignments.values()].filter((assigned) => assigned === segment.slug).length;
      return <article key={segment.slug} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase text-royalBlue">CUSTOMER SEGMENT</p><h2 className="mt-1 text-xl font-semibold text-navy">{segment.en.title}</h2><p className="mt-2 text-sm text-textSecondary">{record ? `Latest revision: v${record.revisions[0]?.version ?? record.publishedRevision?.version ?? 0}` : 'Create the governed initial draft.'} · {journeyCount} published Journey assignments</p></div>
          <div className="flex flex-wrap items-center gap-3"><StatusLabel status={status} />{record ? <Link href={`/admin/customer-segments/${segment.slug}`} className="inline-flex min-h-11 items-center rounded-xl bg-royalBlue px-4 font-semibold text-white">Open editor</Link> : <form action={createCustomerSegmentAction}><input type="hidden" name="slug" value={segment.slug} /><button className="min-h-11 rounded-xl bg-navy px-4 font-semibold text-white">Create draft</button></form>}<Link href={`/admin/contributor/journeys?segment=${segment.slug}`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 font-semibold text-navy">View Journeys</Link></div>
        </div>
      </article>;
    })}</div>
  </>;
}
