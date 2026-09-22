import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusLabel, WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { canEditRevision, canReviewRevision } from '@/lib/permissions';
import { roleAllowsPermission } from '@/server/access-control/role-permissions';
import { requireJourneyCmsAccess } from '@/server/cms/journey-cms-authorization';
import { JourneyCmsRepository } from '@/server/cms/journey-cms-repository';
import { CustomerSegmentRepository } from '@/server/customer-segment/customer-segment-repository';
import { customerSegmentLabels, customerSegmentSlugSchema, type CustomerSegmentSlug } from '@/server/customer-segment/customer-segment-domain';
import { JourneyBusinessEditor } from './JourneyBusinessEditor';
import {
  createJourneyDraftAction,
  publishJourneyRevisionAction,
  reviewJourneyRevisionAction,
  rollbackJourneyRevisionAction,
  setJourneyArchivedAction,
  submitJourneyRevisionAction,
} from '../actions';

export default async function JourneyCmsEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const { user, content } = await requireJourneyCmsAccess(slug, 'EDIT');
  const [journey, activeRevision, assignments] = await Promise.all([
    JourneyCmsRepository.getWorkspace(content.id),
    JourneyCmsRepository.getEditableRevision(content.id),
    CustomerSegmentRepository.getPublishedJourneyAssignments(),
  ]);
  if (!journey) notFound();
  const published = journey.publishedRevision;
  const assignedSegment = assignments.get(slug);
  let plannedSegment: CustomerSegmentSlug | null = null;
  try {
    const preview = journey.previewJson ? JSON.parse(journey.previewJson) as { plannedSegment?: unknown } : null;
    plannedSegment = customerSegmentSlugSchema.safeParse(preview?.plannedSegment).data ?? null;
  } catch {}

  const editable = activeRevision
    ? canEditRevision(user.role, user.id, activeRevision.authorId, activeRevision.status)
      && roleAllowsPermission(user.role, 'EDIT')
    : false;
  const reviewable = activeRevision
    ? canReviewRevision(user.role, user.id, activeRevision.authorId)
      && activeRevision.status === 'IN_REVIEW'
      && roleAllowsPermission(user.role, 'REVIEW')
    : false;
  const publishable = reviewable && roleAllowsPermission(user.role, 'PUBLISH');

  return <>
    <WorkspaceTitle
      eyebrow="Admin · Contributor · Journey Content"
      title={slug.replaceAll('-', ' ')}
      description={published ? 'Published content is immutable. Edit a new Draft revision, then submit it for independent review.' : 'This new Journey remains private until its first Draft passes independent review and publication.'}
    />
    {error ? <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error === 'permission'
        ? 'This action is not permitted for your account or the current revision status. The draft author or an administrator can submit; review and publication require an authorized user other than the author.'
        : 'The Journey CMS action could not be completed. Refresh the page and verify the current revision status.'}</p> : null}
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <StatusLabel status={journey.isArchived ? 'ARCHIVED' : published ? 'PUBLISHED' : activeRevision?.status ?? 'DRAFT'} />
      <span className="text-sm">{published ? `Published revision v${published.version}` : 'Not published · not visible to members'}</span>
      <form action={setJourneyArchivedAction}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="archived" value={journey.isArchived ? 'false' : 'true'} />
        <button className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold">
          {journey.isArchived ? 'Restore Journey' : 'Archive Journey'}
        </button>
      </form>
    </div>
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-royalBlue">Customer Segment</p>
      <div className="mt-2 flex flex-wrap items-center gap-3"><span className={`rounded-full px-3 py-1 text-sm font-semibold ${assignedSegment ? 'bg-blue-50 text-royalBlue' : 'bg-amber-50 text-amber-800'}`}>{assignedSegment ? customerSegmentLabels[assignedSegment] : plannedSegment ? `Unassigned · planned ${customerSegmentLabels[plannedSegment]}` : 'Unassigned'}</span>{assignedSegment ? <Link href={`/admin/customer-segments/${assignedSegment}`} className="text-sm font-semibold text-royalBlue">Manage segment assignment →</Link> : <Link href="/admin/customer-segments" className="text-sm font-semibold text-royalBlue">Assign after publication →</Link>}</div>
      <p className="mt-2 text-xs text-slate-500">Segment assignment is classification only and does not grant member access.</p>
      {published && !assignedSegment ? <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">This Journey is published but will not appear in a Customer Segment collection until a separately reviewed Segment revision assigns it.</p> : null}
    </section>
    <dl className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
      <div><dt className="font-semibold">Content type</dt><dd className="mt-1 text-slate-600">BANKING_JOURNEY</dd></div>
      <div><dt className="font-semibold">Stable slug</dt><dd className="mt-1 font-mono text-slate-600">{slug}</dd></div>
      <div><dt className="font-semibold">Knowledge scope</dt><dd className="mt-1 text-slate-600">{journey.knowledgeScopes.map((scope) => `${scope.knowledgeScope.nameEn} (${scope.knowledgeScope.code})`).join(', ') || 'Not configured'}</dd></div>
      <div><dt className="font-semibold">Published revision</dt><dd className="mt-1 text-slate-600">{published ? `v${published.version} · schema ${published.schemaVersion} · ${published.status}` : 'Not published'}</dd></div>
      <div><dt className="font-semibold">Published author</dt><dd className="mt-1 text-slate-600">{published?.author?.name ?? '—'}</dd></div>
      <div><dt className="font-semibold">Published reviewer</dt><dd className="mt-1 text-slate-600">{published?.reviewer?.name ?? '—'}</dd></div>
      <div><dt className="font-semibold">Published date</dt><dd className="mt-1 text-slate-600">{published?.publishedAt?.toLocaleString() ?? '—'}</dd></div>
      <div><dt className="font-semibold">Last published update</dt><dd className="mt-1 text-slate-600">{published?.updatedAt.toLocaleString() ?? '—'}</dd></div>
    </dl>

    {!activeRevision && published ? <form action={createJourneyDraftAction} className="mb-6">
      <input type="hidden" name="slug" value={slug} />
      <button className="min-h-11 rounded-xl bg-royalBlue px-4 font-semibold text-white">
        Create Draft from Published
      </button>
    </form> : activeRevision ? <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Active revision v{activeRevision.version}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Schema {activeRevision.schemaVersion} · Author: {activeRevision.author?.name ?? 'Unknown'}
            {' · '}Created {activeRevision.createdAt.toLocaleString()}
            {' · '}Updated {activeRevision.updatedAt.toLocaleString()}
          </p>
        </div>
        <StatusLabel status={activeRevision.status} />
      </div>
      {activeRevision.reviewNote ? <p className="mt-4 rounded-xl bg-goldPale p-3 text-sm">{activeRevision.reviewNote}</p> : null}

      {editable ? <JourneyBusinessEditor
        slug={slug}
        revisionId={activeRevision.id}
        initialContentJson={activeRevision.contentJson}
      /> : null}

      {editable && (user.role === 'ADMIN' || activeRevision.authorId === user.id) && ['DRAFT', 'CHANGES_REQUESTED'].includes(activeRevision.status) ? <form action={submitJourneyRevisionAction} className="mt-4">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="revisionId" value={activeRevision.id} />
        <button className="min-h-11 rounded-xl bg-royalBlue px-4 font-semibold text-white">
          Submit for Review
        </button>
      </form> : null}

      {reviewable ? <form action={reviewJourneyRevisionAction} className="mt-5 rounded-xl border border-slate-200 p-4">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="revisionId" value={activeRevision.id} />
        <label className="block font-semibold">
          Review note
          <textarea name="reviewNote" required minLength={10} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" />
        </label>
        <div className="mt-3 flex flex-wrap gap-3">
          <button name="decision" value="changes" className="min-h-11 rounded-xl border border-amber-600 px-4 font-semibold text-amber-800">
            Request Changes
          </button>
          <button name="decision" value="reject" className="min-h-11 rounded-xl border border-red-600 px-4 font-semibold text-red-700">
            Reject
          </button>
        </div>
      </form> : null}

      {publishable ? <form action={publishJourneyRevisionAction} className="mt-4">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="revisionId" value={activeRevision.id} />
        <button className="min-h-11 rounded-xl bg-emerald-700 px-4 font-semibold text-white">
          Publish Reviewed Revision
        </button>
      </form> : null}
    </section> : <p className="mb-6 rounded-xl bg-amber-50 p-4 text-amber-900">No editable revision is available.</p>}

    <div className="grid gap-6 xl:grid-cols-2">
      {published ? <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold">Current published reference</h2>
        <pre className="mt-4 max-h-[640px] overflow-auto whitespace-pre-wrap text-xs leading-5">
          {JSON.stringify(JSON.parse(published.contentJson), null, 2)}
        </pre>
      </section> : <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5"><h2 className="text-xl font-semibold">Current published reference</h2><p className="mt-3 text-sm text-slate-600">No published revision yet.</p></section>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold">Revision history</h2>
        <div className="mt-4 space-y-3">
          {journey.revisions.map((revision) => <article key={revision.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">Version {revision.version}</p>
                <p className="text-xs text-slate-500">
                  Author: {revision.author?.name ?? 'Migration'} · Reviewer: {revision.reviewer?.name ?? '—'}
                  {' · '}Created {revision.createdAt.toLocaleDateString()}
                  {' · '}Updated {revision.updatedAt.toLocaleDateString()}
                  {revision.publishedAt ? ` · Published ${revision.publishedAt.toLocaleDateString()}` : ''}
                </p>
              </div>
              <StatusLabel status={revision.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href={`/admin/contributor/journeys/${slug}/revisions/${revision.id}`} className="text-sm font-semibold text-royalBlue">
                View revision
              </Link>
              {revision.status === 'PUBLISHED' && revision.id !== journey.publishedRevisionId
                && roleAllowsPermission(user.role, 'MANAGE') ? <form action={rollbackJourneyRevisionAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="revisionId" value={revision.id} />
                  <button className="text-sm font-semibold text-amber-800">Rollback to this version</button>
                </form> : null}
            </div>
          </article>)}
        </div>
      </section>
    </div>
  </>;
}
