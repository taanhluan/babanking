import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { BaDocumentReader } from '@/components/ba-documents/BaDocumentReader';
import { getCurrentLocale } from '@/i18n/server';
import { BaDocumentExportControl } from '@/components/ba-documents/BaDocumentExportControl';
import { loadAuthorizedPublishedBaDocumentView } from '@/server/ba-document/ba-document-export-service';
import { TranslationUnavailable } from '@/components/content/TranslationUnavailable';

function title(value: string | null, fallback: string) { try { return (JSON.parse(value ?? '{}') as {title?:string}).title ?? fallback; } catch { return fallback; } }
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ module?: string }> }) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const view = await loadAuthorizedPublishedBaDocumentView(slug, locale);
  if (view.translationUnavailable) return <TranslationUnavailable englishPath={`/ba-documents/${slug}`}/>;
  const { record, content } = view;
  return <><Navbar/><main className="min-w-0 overflow-hidden"><header className="border-b bg-bgLight px-4 py-8 sm:px-6"><div className="mx-auto max-w-7xl"><p className="text-xs font-semibold uppercase tracking-wide text-royalBlue">{content.metadata.documentCode} · {content.documentType}</p><h1 className="mt-2 break-words text-3xl font-semibold text-navy sm:text-4xl">{content.metadata.title}</h1><p className="mt-3 max-w-3xl leading-7 text-textSecondary">{content.metadata.summary}</p><dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm"><div><dt className="font-semibold">Primary Journey</dt><dd>{title(record.primaryJourney?.previewJson ?? null,record.primaryJourney?.slug ?? '')}</dd></div><div><dt className="font-semibold">Published version</dt><dd>v{record.publishedRevision.version}</dd></div><div><dt className="font-semibold">Last updated</dt><dd>{record.publishedRevision.updatedAt.toLocaleDateString()}</dd></div></dl><BaDocumentExportControl slug={slug} locale={locale}/></div></header><section className="px-4 py-8 sm:px-6"><div className="mx-auto max-w-7xl"><BaDocumentReader content={content} slug={slug} activeModuleId={(await searchParams).module}/></div></section></main><Footer/></>;
}
