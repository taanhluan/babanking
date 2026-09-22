import Link from 'next/link';
import { WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { requireJourneyCmsRouteAvailability } from '@/server/cms/journey-cms-environment';
import { customerSegmentLabels, customerSegmentSlugs } from '@/server/customer-segment/customer-segment-domain';
import { createJourneyAction } from '../actions';

export default async function NewJourneyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  requireJourneyCmsRouteAvailability();
  await requireRole('ADMIN');
  const [scopes, { error }] = await Promise.all([
    db.knowledgeScope.findMany({ where: { isActive: true }, orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }], select: { id: true, code: true, nameEn: true } }),
    searchParams,
  ]);
  return <>
    <WorkspaceTitle eyebrow="Admin · Contributor · Journey Content" title="Create Banking Journey" description="Create an audited Draft identity. It remains private and unassigned until independently published and assigned through Customer Segment review." />
    {error ? <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error === 'workflow' ? 'The Journey slug already exists or the selected scope is unavailable.' : 'Check the title, stable slug, summary, segment and knowledge scope.'}</p> : null}
    <form action={createJourneyAction} className="max-w-3xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <label className="block text-sm font-semibold">Title<input required name="title" minLength={5} maxLength={160} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal" /></label>
      <label className="block text-sm font-semibold">Stable slug<input required name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="sme-business-onboarding" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-mono font-normal" /><span className="mt-1 block text-xs font-normal text-slate-500">Permanent after creation.</span></label>
      <label className="block text-sm font-semibold">Summary<textarea required name="summary" minLength={30} maxLength={500} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
      <label className="block text-sm font-semibold">Planned customer segment<select required name="plannedSegment" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal">{customerSegmentSlugs.map((slug) => <option key={slug} value={slug}>{customerSegmentLabels[slug]}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Planning metadata only. It does not assign the Journey or grant access.</span></label>
      <label className="block text-sm font-semibold">Knowledge scope<select required name="knowledgeScopeId" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal">{scopes.map((scope) => <option key={scope.id} value={scope.id}>{scope.nameEn} ({scope.code})</option>)}</select></label>
      {!scopes.length ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No active knowledge scope is available. Create one before creating a Journey.</p> : null}
      <div className="flex flex-wrap gap-3"><button disabled={!scopes.length} className="min-h-11 rounded-xl bg-navy px-5 font-semibold text-white disabled:opacity-50">Create Draft</button><Link href="/admin/contributor/journeys" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 font-semibold">Cancel</Link></div>
    </form>
  </>;
}
