'use client';

import { useState } from 'react';

export function BaDocumentExportControl({ slug, locale }: { slug: string; locale: 'en' | 'vi' }) {
  const [busy, setBusy] = useState<'docx' | 'pdf' | null>(null);
  const [error, setError] = useState(false);
  async function download(format: 'docx' | 'pdf') {
    setBusy(format); setError(false);
    try {
      const response = await fetch(`/${locale}/api/ba-documents/${encodeURIComponent(slug)}/export?format=${format}&locale=${locale}`, { credentials: 'same-origin' });
      const expectedType = format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';
      if (!response.ok || response.redirected || !response.headers.get('content-type')?.startsWith(expectedType)) throw new Error('Export failed');
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') ?? '';
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `BA-Document.${format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch { setError(true); } finally { setBusy(null); }
  }
  return <div className="mt-5 flex flex-wrap items-center gap-2" aria-live="polite">
    <span className="text-sm font-semibold text-navy">Export</span>
    <button type="button" disabled={busy !== null} onClick={() => download('docx')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-royalBlue disabled:opacity-60">{busy === 'docx' ? 'Generating Word…' : 'Word (.docx)'}</button>
    <button type="button" disabled={busy !== null} onClick={() => download('pdf')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-royalBlue disabled:opacity-60">{busy === 'pdf' ? 'Generating PDF…' : 'PDF (.pdf)'}</button>
    {error ? <span className="text-sm font-semibold text-red-700">Export could not be generated. Please try again.</span> : null}
  </div>;
}
