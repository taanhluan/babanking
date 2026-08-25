import { NextResponse } from 'next/server';
import { renderBaDocumentDocx } from '@/server/ba-document/ba-document-docx';
import { buildBaDocumentExportFilename } from '@/server/ba-document/ba-document-export-model';
import { renderBaDocumentPdf } from '@/server/ba-document/ba-document-pdf';
import { loadAuthorizedPublishedBaDocumentExport } from '@/server/ba-document/ba-document-export-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const search = new URL(request.url).searchParams;
  const format = search.get('format');
  const locale = search.get('locale') === 'vi' ? 'vi' : 'en';
  if (format !== 'docx' && format !== 'pdf') return NextResponse.json({ error: 'Unsupported export format.' }, { status: 400 });
  const model = await loadAuthorizedPublishedBaDocumentExport(slug, locale);
  const binary = format === 'docx' ? await renderBaDocumentDocx(model) : await renderBaDocumentPdf(model);
  return new Response(new Uint8Array(binary), {
    headers: {
      'Content-Type': format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf',
      'Content-Disposition': `attachment; filename="${buildBaDocumentExportFilename(model, format)}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
