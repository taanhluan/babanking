import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { WorkspaceTitle, StatusLabel } from '@/components/workspace/WorkspaceShell';
import { customerSegmentLabels, customerSegmentSlugSchema, parseCustomerSegmentContent } from '@/server/customer-segment/customer-segment-domain';
import { CustomerSegmentRepository } from '@/server/customer-segment/customer-segment-repository';
import { createCustomerSegmentDraftAction, saveCustomerSegmentAction, submitCustomerSegmentAction } from '../actions';

function journeyTitle(previewJson: string | null, slug: string) {
  try {
    const value = previewJson ? JSON.parse(previewJson) as { title?: unknown } : null;
    return typeof value?.title === 'string' ? value.title : slug.replaceAll('-', ' ');
  } catch {
    return slug.replaceAll('-', ' ');
  }
}

export default async function CustomerSegmentEditor({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireRole('ADMIN');
  const slug = customerSegmentSlugSchema.safeParse((await params).slug);
  if (!slug.success) notFound();
  const [item, journeyOptions] = await Promise.all([
    db.contentItem.findUnique({ where: { type_slug: { type: 'CUSTOMER_SEGMENT', slug: slug.data } }, include: { revisions: { orderBy: { version: 'desc' } }, publishedRevision: true } }),
    CustomerSegmentRepository.listPublishedJourneyOptions(),
  ]);
  if (!item) notFound();
  const revision = item.revisions.find((value) => ['DRAFT', 'CHANGES_REQUESTED'].includes(value.status)) ?? item.revisions[0];
  const editable = revision && ['DRAFT', 'CHANGES_REQUESTED'].includes(revision.status);
  const content = revision ? parseCustomerSegmentContent(revision.contentJson) : null;
  const selected = new Set(content?.journeys ?? []);
  const error = (await searchParams).error;

  return <>
    <WorkspaceTitle eyebrow="Administration · Customer Segment" title={customerSegmentLabels[slug.data]} description="Manage landing content and published Journey assignments. Stable segment and Journey slugs cannot change." />
    <StatusLabel status={revision?.status ?? 'NOT_STARTED'} />
    {error ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error === 'invalid-json' ? 'Invalid JSON. Check commas, quotes and brackets.' : 'Invalid Customer Segment schema. Keep schemaVersion, EN/VI content and valid published Journey assignments.'}</p> : null}

    {revision && editable ? <>
      <form action={saveCustomerSegmentAction} className="mt-5 space-y-6">
        <input type="hidden" name="slug" value={slug.data} />
        <input type="hidden" name="revisionId" value={revision.id} />
        <input type="hidden" name="journeyAssignmentEditor" value="1" />
        <section className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-xl font-semibold text-navy">Journeys</h2><p className="mt-1 text-sm text-textSecondary">Only published, non-archived Journeys are eligible. Assignment classifies content but never grants access.</p></div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-royalBlue">{selected.size} selected</span>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">{journeyOptions.map((journey) => {
            const ownedByOther = journey.assignedSegment && journey.assignedSegment !== slug.data;
            return <label key={journey.id} className={`flex gap-3 rounded-xl border p-4 ${ownedByOther ? 'bg-slate-50 text-slate-400' : 'bg-white'}`}>
              <input type="checkbox" name="journeys" value={journey.slug} defaultChecked={selected.has(journey.slug)} disabled={Boolean(ownedByOther)} className="mt-1 size-4" />
              <span><span className="block font-semibold">{journeyTitle(journey.previewJson, journey.slug)}</span><span className="mt-1 block font-mono text-xs">{journey.slug}</span>{journey.assignedSegment ? <span className="mt-1 block text-xs">Published assignment: {customerSegmentLabels[journey.assignedSegment]}</span> : <span className="mt-1 block text-xs text-amber-700">Unassigned</span>}</span>
            </label>;
          })}</div>
          {!journeyOptions.length ? <p className="mt-5 rounded-xl border border-dashed p-5 text-sm text-slate-600">No published Journey is available for assignment.</p> : null}
        </section>

        <details className="rounded-2xl border bg-white p-5" open>
          <summary className="cursor-pointer text-xl font-semibold text-navy">Overview, landing content and advanced JSON</summary>
          <label className="mt-5 block font-semibold">Segment content JSON<textarea name="contentJson" rows={28} defaultValue={revision.contentJson} className="mt-2 w-full rounded-xl border p-3 font-mono text-sm" /></label>
          <p className="mt-2 text-sm text-textSecondary">The Journey picker above is authoritative for `journeys` on save. Keep EN/VI landing content and sections in this JSON.</p>
        </details>
        <button className="min-h-11 rounded-xl border border-royalBlue px-4 font-semibold text-royalBlue">Save Draft</button>
      </form>
      <form action={submitCustomerSegmentAction} className="mt-4"><input type="hidden" name="slug" value={slug.data} /><input type="hidden" name="revisionId" value={revision.id} /><button className="min-h-11 rounded-xl bg-royalBlue px-4 font-semibold text-white">Submit for Review</button></form>
    </> : item.publishedRevision ? <form action={createCustomerSegmentDraftAction} className="mt-5 rounded-xl bg-goldPale p-4"><input type="hidden" name="slug" value={slug.data} /><p>This revision is read-only. Create a governed draft from the current published version to make a change.</p><button className="mt-3 min-h-11 rounded-xl bg-navy px-4 font-semibold text-white">Create new draft</button></form> : <p className="mt-5 rounded-xl bg-goldPale p-4">This revision is read-only.</p>}

    <section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-semibold">Revision history</h2><ul className="mt-3 space-y-2 text-sm">{item.revisions.map((value) => <li key={value.id}>v{value.version} · {value.status} · {value.authorId ?? 'migration'}</li>)}</ul></section>
    <div className="mt-5 flex flex-wrap gap-4"><Link href="/admin/customer-segments" className="font-semibold text-royalBlue">← Customer Segments</Link><Link href={`/admin/contributor/journeys?segment=${slug.data}`} className="font-semibold text-royalBlue">Open Journey CMS filter →</Link></div>
  </>;
}
