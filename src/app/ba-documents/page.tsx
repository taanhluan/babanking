import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { PageHero } from '@/components/layout/PageHero';
import { Container } from '@/components/ui/Container';
import { requirePremiumAccess } from '@/lib/membership';
import { BaDocumentRepository } from '@/server/ba-document/ba-document-repository';

function preview(value: string | null) { try { return JSON.parse(value ?? '{}') as { title?: string; summary?: string; documentType?: string }; } catch { return {}; } }
function journeyTitle(value: string | null, slug: string) { const data=preview(value); return data.title ?? slug.replaceAll('-', ' '); }
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; journey?: string }> }) {
  const user = await requirePremiumAccess('/ba-documents');
  const params = await searchParams;
  const items = await BaDocumentRepository.listPublishedAuthorized(user.id);
  const query = params.q?.trim().toLowerCase() ?? '';
  const filtered = items.filter((item) => { const data=preview(item.previewJson); return (!params.type || data.documentType===params.type) && (!params.journey || item.primaryJourney?.slug===params.journey) && (!query || `${data.title} ${data.summary} ${item.slug}`.toLowerCase().includes(query)); });
  const journeys = [...new Map(items.filter((item)=>item.primaryJourney).map((item)=>[item.primaryJourney!.slug,journeyTitle(item.primaryJourney!.previewJson,item.primaryJourney!.slug)])).entries()];
  return <><Navbar/><main><PageHero eyebrow="Governed BA Knowledge" title="BA Document Library" description="Published analysis and delivery artifacts inherited from Journeys in your knowledge access." current="BA Documents"/><section className="px-4 py-10 sm:px-6"><Container><form className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-4"><input name="q" defaultValue={params.q} placeholder="Search documents" className="min-h-11 rounded-xl border px-3"/><select name="type" defaultValue={params.type} className="min-h-11 rounded-xl border px-3"><option value="">All document types</option>{['BRD','REQUIREMENT_SPECIFICATION','PROCESS_SPECIFICATION','DATA_SPECIFICATION','UAT_SPECIFICATION'].map((type)=><option key={type}>{type}</option>)}</select><select name="journey" defaultValue={params.journey} className="min-h-11 rounded-xl border px-3"><option value="">All Primary Journeys</option>{journeys.map(([slug,title])=><option key={slug} value={slug}>{title}</option>)}</select><button className="rounded-xl bg-royalBlue px-4 font-semibold text-white">Filter</button></form><div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((item)=>{const data=preview(item.previewJson);return <article key={item.id} className="rounded-2xl border bg-white p-5"><p className="text-xs font-semibold uppercase text-royalBlue">{data.documentType ?? 'BA Document'} · v{item.publishedRevision?.version}</p><h2 className="mt-2 text-xl font-semibold text-navy">{data.title ?? item.slug}</h2><p className="mt-1 text-sm font-semibold text-slate-600">{journeyTitle(item.primaryJourney?.previewJson ?? null,item.primaryJourney?.slug ?? '')}</p><p className="mt-3 text-sm leading-6 text-textSecondary">{data.summary}</p><p className="mt-4 text-xs text-slate-500">Owner: {item.owner?.name ?? 'Unassigned'} · Updated {item.updatedAt.toLocaleDateString()}</p><Link href={`/ba-documents/${item.slug}`} className="mt-4 inline-flex min-h-11 items-center font-semibold text-royalBlue">Read document →</Link></article>})}</div>{!filtered.length?<p className="mt-7 rounded-xl border border-dashed p-6 text-textSecondary">No accessible published BA Documents match these filters.</p>:null}</Container></section></main><Footer/></>;
}
