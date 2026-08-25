import 'server-only';
import { notFound } from 'next/navigation';
import { validateTranslationStructure } from './ba-document-authoring';
import { requireBaDocumentAccessBySlug } from './ba-document-authorization';
import { parseBaDocumentContent } from './ba-document-domain';
import { buildBaDocumentExportModel, type ExportLocale } from './ba-document-export-model';
import { BaDocumentRepository } from './ba-document-repository';

function journeyTitle(previewJson: string | null | undefined, fallback: string) {
  try { return (JSON.parse(previewJson ?? '{}') as { title?: string }).title ?? fallback; } catch { return fallback; }
}

export async function loadAuthorizedPublishedBaDocumentView(slug: string, locale: ExportLocale) {
  // Deliberate boundary: identity, membership, role and Primary Journey access
  // are established before any protected document metadata/content query.
  const { document } = await requireBaDocumentAccessBySlug(slug, 'VIEW');
  const record = await BaDocumentRepository.getPublished(document);
  const publishedRevision = record?.publishedRevision;
  if (!record || !publishedRevision) notFound();
  const publishedRecord = { ...record, publishedRevision };
  const source = parseBaDocumentContent(JSON.parse(publishedRevision.contentJson));
  const translation = locale === 'vi' ? await BaDocumentRepository.getPublishedTranslation(document, 'vi') : null;
  if (locale === 'vi' && !translation?.publishedRevision) return { record: publishedRecord, content: source, sourceRevision: publishedRevision, locale, translationUnavailable: true as const };
  const translated = translation?.publishedRevision ? parseBaDocumentContent(JSON.parse(translation.publishedRevision.contentJson)) : null;
  if (translated && !validateTranslationStructure(source, translated).valid) return { record: publishedRecord, content: source, sourceRevision: publishedRevision, locale, translationUnavailable: true as const };
  const selected = translated && translation?.publishedRevision
    ? { content: translated, revision: translation.publishedRevision }
    : { content: source, revision: publishedRevision };
  return { record: publishedRecord, content: selected.content, sourceRevision: selected.revision, locale, translationUnavailable: false as const };
}

export async function loadAuthorizedPublishedBaDocumentExport(slug: string, locale: ExportLocale) {
  const view = await loadAuthorizedPublishedBaDocumentView(slug, locale);
  if (view.translationUnavailable) notFound();
  const { record, content, sourceRevision, locale: selectedLocale } = view;
  return buildBaDocumentExportModel({
    content,
    sourceRevisionId: sourceRevision.id,
    locale: selectedLocale,
    primaryJourney: journeyTitle(record.primaryJourney?.previewJson, record.primaryJourney?.slug ?? ''),
    version: sourceRevision.version,
    publishedAt: sourceRevision.publishedAt,
    updatedAt: sourceRevision.updatedAt,
    authorOrPublisher: record.owner?.name,
  });
}
