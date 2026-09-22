import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { StatusLabel, WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { requireJourneyCmsRouteAvailability } from '@/server/cms/journey-cms-environment';
import { JourneyCmsRepository } from '@/server/cms/journey-cms-repository';
import { CustomerSegmentRepository } from '@/server/customer-segment/customer-segment-repository';
import { customerSegmentLabels, customerSegmentSlugSchema, customerSegmentSlugs } from '@/server/customer-segment/customer-segment-domain';

function preview(value: string | null) {
  try {
    const parsed = value ? JSON.parse(value) as { title?: unknown; summary?: unknown; plannedSegment?: unknown } : null;
    return {
      title: typeof parsed?.title === 'string' ? parsed.title : 'Untitled Journey',
      summary: typeof parsed?.summary === 'string' ? parsed.summary : '',
      plannedSegment: customerSegmentSlugSchema.safeParse(parsed?.plannedSegment).data ?? null,
    };
  } catch {
    return { title: 'Untitled Journey', summary: '', plannedSegment: null };
  }
}

export default async function JourneyCmsListPage({ searchParams }: { searchParams: Promise<{ segment?: string }> }) {
  requireJourneyCmsRouteAvailability();
  const user = await requireRole('ADMIN');
  const [journeys, assignments] = await Promise.all([
    JourneyCmsRepository.listAuthorized(user.id),
    CustomerSegmentRepository.getPublishedJourneyAssignments(),
  ]);
  const requestedFilter = (await searchParams).segment;
  const parsedFilter = customerSegmentSlugSchema.safeParse(requestedFilter);
  const filter = requestedFilter === 'unassigned' ? 'unassigned' : parsedFilter.success ? parsedFilter.data : 'all';
  const visibleJourneys = journeys.filter((journey) => {
    const assigned = assignments.get(journey.slug);
    const planned = preview(journey.previewJson).plannedSegment;
    return filter === 'all' || (filter === 'unassigned' ? !assigned : assigned === filter || (!assigned && planned === filter));
  });
  const filters = [
    { value: 'all', label: 'All', count: journeys.length },
    ...customerSegmentSlugs.map((slug) => ({ value: slug, label: customerSegmentLabels[slug], count: journeys.filter((journey) => assignments.get(journey.slug) === slug || (!assignments.has(journey.slug) && preview(journey.previewJson).plannedSegment === slug)).length })),
    { value: 'unassigned', label: 'Unassigned', count: journeys.filter((journey) => !assignments.has(journey.slug)).length },
  ];
  return <>
    <WorkspaceTitle
      eyebrow="Admin · Contributor · Journey Content"
      title="Journey CMS"
      description="Controlled Journey editing with segment context, versioned drafts, independent review, publication history and rollback."
    />
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <nav aria-label="Journey segment filters" className="flex flex-wrap gap-2">{filters.map((item) => <Link key={item.value} href={item.value === 'all' ? '/admin/contributor/journeys' : `/admin/contributor/journeys?segment=${item.value}`} aria-current={filter === item.value ? 'page' : undefined} className={`rounded-full border px-4 py-2 text-sm font-semibold ${filter === item.value ? 'border-royalBlue bg-blue-50 text-royalBlue' : 'border-slate-300 bg-white text-slate-600'}`}>{item.label} ({item.count})</Link>)}</nav>
      <Link href="/admin/contributor/journeys/new" className="inline-flex min-h-11 items-center rounded-xl bg-navy px-4 font-semibold text-white">Create Banking Journey</Link>
    </div>
    <div className="space-y-3">
      {visibleJourneys.map((journey) => {
        const metadata = preview(journey.previewJson);
        const latest = journey.revisions[0];
        const assignedSegment = assignments.get(journey.slug);
        return <article key={journey.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2"><p className="text-xs text-slate-500">{journey.slug}</p><span className={`rounded-full px-2 py-1 text-xs font-semibold ${assignedSegment ? 'bg-blue-50 text-royalBlue' : 'bg-amber-50 text-amber-800'}`}>{assignedSegment ? customerSegmentLabels[assignedSegment] : metadata.plannedSegment ? `Unassigned · planned ${customerSegmentLabels[metadata.plannedSegment]}` : 'Unassigned'}</span></div>
              <h2 className="mt-1 text-lg font-semibold">{metadata.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{metadata.summary}</p>
              <p className="mt-2 text-xs text-slate-500">
                Latest revision: {latest
                  ? `v${latest.version} · ${latest.status} · schema ${latest.schemaVersion}`
                  : 'none'}
              </p>
              {latest ? <p className="mt-1 text-xs text-slate-500">
                Author: {latest.author?.name ?? 'Migration'} · Reviewer: {latest.reviewer?.name ?? '—'}
                {' · '}Created {latest.createdAt.toLocaleDateString()}
                {' · '}Updated {latest.updatedAt.toLocaleDateString()}
                {latest.publishedAt ? ` · Published ${latest.publishedAt.toLocaleDateString()}` : ''}
              </p> : null}
            </div>
            <div className="flex items-center gap-3">
              <StatusLabel status={journey.isArchived ? 'ARCHIVED' : journey.publishedRevisionId ? 'PUBLISHED' : 'DRAFT'} />
              <Link href={`/admin/contributor/journeys/${journey.slug}`} className="font-semibold text-royalBlue">
                Open editor
              </Link>
            </div>
          </div>
        </article>;
      })}
      {!visibleJourneys.length ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">No Journeys match this segment filter.</p> : null}
    </div>
  </>;
}
