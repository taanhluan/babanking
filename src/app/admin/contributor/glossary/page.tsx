import Link from 'next/link';
import type { Route } from 'next';
import { EmptyState, StatusLabel, WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { requireJourneyCmsRouteAvailability } from '@/server/cms/journey-cms-environment';
import { GlossaryRepository } from '@/server/glossary/glossary-repository';
import { createGlossaryEntryAction } from './actions';

function preview(value: string | null) { try { return JSON.parse(value ?? '{}') as { title?: string; kind?: string }; } catch { return {}; } }

export default async function GlossaryCmsPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string; kind?: string }> }) {
  requireJourneyCmsRouteAvailability();
  const params = await searchParams;
  const items = await GlossaryRepository.listForCms();
  const rows = items.filter((item) => (!params.status || item.revisions[0]?.status === params.status) && (!params.kind || preview(item.previewJson).kind === params.kind));
  return <>
    <WorkspaceTitle eyebrow="Admin · Contributor" title="Glossary & Regulations" description="Create and govern banking terms and regulations. Entries become visible to members only after independent publication." />
    {params.error ? <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{params.error}</p> : null}
    <form action={createGlossaryEntryAction} className="mb-6 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_1.5fr_auto_auto] md:items-end">
      <label className="grid gap-1 text-sm font-semibold text-navy">Slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={120} placeholder="e.g. kyc or circular-16-2020" className="min-h-11 rounded-xl border px-3 font-normal"/></label>
      <label className="grid gap-1 text-sm font-semibold text-navy">Name (EN)<input name="name" required maxLength={200} className="min-h-11 rounded-xl border px-3 font-normal"/></label>
      <label className="grid gap-1 text-sm font-semibold text-navy">Type<select name="kind" className="min-h-11 rounded-xl border px-3 font-normal"><option value="TERM">Term</option><option value="REGULATION">Regulation</option></select></label>
      <button className="min-h-11 rounded-xl bg-royalBlue px-4 font-semibold text-white">Create draft</button>
    </form>
    <form method="get" className="mb-4 flex flex-wrap gap-2">
      <select name="status" defaultValue={params.status ?? ''} className="min-h-11 rounded-xl border px-3"><option value="">All latest statuses</option>{['DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'PUBLISHED', 'REJECTED'].map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select>
      <select name="kind" defaultValue={params.kind ?? ''} className="min-h-11 rounded-xl border px-3"><option value="">All types</option><option value="TERM">Term</option><option value="REGULATION">Regulation</option></select>
      <button className="min-h-11 rounded-xl border px-4 font-semibold text-navy">Filter</button>
    </form>
    {rows.length ? <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[640px] text-left text-sm">
      <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Entry</th><th className="p-3">Type</th><th className="p-3">Latest revision</th><th className="p-3">Published</th></tr></thead>
      <tbody>{rows.map((item) => <tr key={item.id} className="border-b last:border-0">
        <td className="p-3"><Link href={`/admin/contributor/glossary/${item.slug}` as Route} className="font-semibold text-royalBlue hover:underline">{preview(item.previewJson).title ?? item.slug}</Link><span className="block text-xs text-slate-500">{item.slug}{item.isArchived ? ' · archived' : ''}</span></td>
        <td className="p-3">{preview(item.previewJson).kind ?? '—'}</td>
        <td className="p-3">{item.revisions[0] ? <>v{item.revisions[0].version} <StatusLabel status={item.revisions[0].status}/></> : '—'}</td>
        <td className="p-3">{item.publishedRevisionId ? 'Yes' : 'No'}</td>
      </tr>)}</tbody>
    </table></div> : <EmptyState title="No glossary entries" description="Create the first term or regulation above."/>}
  </>;
}
