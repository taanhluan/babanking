import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusLabel, WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { canEditRevision, canReviewRevision } from '@/lib/permissions';
import { roleAllowsPermission } from '@/server/access-control/role-permissions';
import { requireJourneyCmsAccess } from '@/server/cms/journey-cms-authorization';
import { JourneyCmsRepository } from '@/server/cms/journey-cms-repository';
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user, content } = await requireJourneyCmsAccess(slug, 'VIEW');
  const [journey, activeRevision] = await Promise.all([
    JourneyCmsRepository.getWorkspace(content.id),
    JourneyCmsRepository.getEditableRevision(content.id),
  ]);
  if (!journey?.publishedRevision) notFound();

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
      description="Published content is immutable. Edit a new Draft revision, then submit it for independent review."
    />
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <StatusLabel status={journey.isArchived ? 'ARCHIVED' : 'PUBLISHED'} />
      <span className="text-sm">Published revision v{journey.publishedRevision.version}</span>
      <form action={setJourneyArchivedAction}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="archived" value={journey.isArchived ? 'false' : 'true'} />
        <button className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold">
          {journey.isArchived ? 'Restore Journey' : 'Archive Journey'}
        </button>
      </form>
    </div>
    <dl className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
      <div><dt className="font-semibold">Content type</dt><dd className="mt-1 text-slate-600">BANKING_JOURNEY</dd></div>
      <div><dt className="font-semibold">Stable slug</dt><dd className="mt-1 font-mono text-slate-600">{slug}</dd></div>
      <div><dt className="font-semibold">Knowledge scope</dt><dd className="mt-1 text-slate-600">{journey.knowledgeScopes.map((scope) => `${scope.knowledgeScope.nameEn} (${scope.knowledgeScope.code})`).join(', ') || 'Not configured'}</dd></div>
      <div><dt className="font-semibold">Published revision</dt><dd className="mt-1 text-slate-600">v{journey.publishedRevision.version} · schema {journey.publishedRevision.schemaVersion} · {journey.publishedRevision.status}</dd></div>
      <div><dt className="font-semibold">Published author</dt><dd className="mt-1 text-slate-600">{journey.publishedRevision.author?.name ?? 'Migration'}</dd></div>
      <div><dt className="font-semibold">Published reviewer</dt><dd className="mt-1 text-slate-600">{journey.publishedRevision.reviewer?.name ?? '—'}</dd></div>
      <div><dt className="font-semibold">Published date</dt><dd className="mt-1 text-slate-600">{journey.publishedRevision.publishedAt?.toLocaleString() ?? '—'}</dd></div>
      <div><dt className="font-semibold">Last published update</dt><dd className="mt-1 text-slate-600">{journey.publishedRevision.updatedAt.toLocaleString()}</dd></div>
    </dl>

    {!activeRevision ? <form action={createJourneyDraftAction} className="mb-6">
      <input type="hidden" name="slug" value={slug} />
      <button className="min-h-11 rounded-xl bg-royalBlue px-4 font-semibold text-white">
        Create Draft from Published
      </button>
    </form> : <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
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

      {editable && ['DRAFT', 'CHANGES_REQUESTED'].includes(activeRevision.status) ? <form action={submitJourneyRevisionAction} className="mt-4">
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
    </section>}

    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold">Current published reference</h2>
        <pre className="mt-4 max-h-[640px] overflow-auto whitespace-pre-wrap text-xs leading-5">
          {JSON.stringify(JSON.parse(journey.publishedRevision.contentJson), null, 2)}
        </pre>
      </section>
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
