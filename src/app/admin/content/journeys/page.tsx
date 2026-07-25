import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { WorkspaceTitle, StatusLabel } from '@/components/workspace/WorkspaceShell';
import { JourneyCmsRepository } from '@/server/cms/journey-repository';

export default async function AdminJourneysPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole('ADMIN');
  const { q = '' } = await searchParams;
  const journeys = await JourneyCmsRepository.list(q.trim());
  return <>
    <WorkspaceTitle eyebrow="CMS · Banking Journeys" title="Journey Library" description="Manage Journey metadata and draft structure without changing public content until publication." />
    <div className="mb-5 flex flex-wrap gap-3"><form className="flex min-w-[18rem] flex-1 gap-2"><input name="q" defaultValue={q} placeholder="Search slug or category" className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3" /><button className="rounded-xl bg-royalBlue px-4 font-semibold text-white">Search</button></form><Link href="/admin/content/journeys/new" className="rounded-xl bg-goldAccent px-4 py-3 font-semibold text-navy">Create Journey</Link></div>
    <div className="space-y-3">{journeys.map((journey) => { const raw = journey.publishedRevision?.contentJson; let title = journey.slug; try { title = raw ? (JSON.parse(raw).title || journey.slug) : journey.slug; } catch {} const status = journey.isArchived ? 'ARCHIVED' : journey.publishedRevisionId ? 'PUBLISHED' : 'DRAFT'; return <article key={journey.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs text-slate-500">{journey.slug} · {journey.category || 'Uncategorized'}</p><h2 className="font-semibold">{title}</h2><p className="text-sm text-slate-500">Updated {journey.updatedAt.toLocaleDateString()}</p></div><div className="flex items-center gap-3"><StatusLabel status={status} /><Link href={`/admin/content/journeys/${journey.id}`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">Edit</Link></div></article>; })}</div>
  </>;
}
