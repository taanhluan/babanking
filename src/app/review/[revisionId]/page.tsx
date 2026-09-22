import { notFound } from 'next/navigation';
import { reviewRevisionAction } from '@/app/actions';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { canReviewRevision } from '@/lib/permissions';
import { BaDocumentReader } from '@/components/ba-documents/BaDocumentReader';
import { StatusLabel, WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { requireBaDocumentRevisionAccess } from '@/server/ba-document/ba-document-authorization';
import { parseBaDocumentContent } from '@/server/ba-document/ba-document-domain';
import { BaDocumentRepository } from '@/server/ba-document/ba-document-repository';
import { isReviewDetailContentType } from '@/server/review/generic-review-workflow';

export default async function ReviewDetail({ params }: { params: Promise<{ revisionId: string }> }) {
  const user = await requireRole('REVIEWER'); const { revisionId } = await params;
  const identity = await db.contentRevision.findUnique({ where: { id: revisionId }, select: { contentItem: { select: { type: true } } } });
  if (identity?.contentItem.type === 'BA_DOCUMENT') {
    const { document } = await requireBaDocumentRevisionAccess(revisionId, 'REVIEW');
    const [revision,workspace] = await Promise.all([BaDocumentRepository.getRevision(document,revisionId),BaDocumentRepository.getWorkspace(document)]);
    if (!revision || !workspace) notFound();
    const content=parseBaDocumentContent(JSON.parse(revision.contentJson));
    const allowed=canReviewRevision(user.role,user.id,revision.authorId)&&revision.status==='IN_REVIEW';
    return <><WorkspaceTitle eyebrow="BA Document Review" title={content.metadata.title} description={`${content.metadata.documentCode} · ${content.documentType} · Primary Journey ${content.metadata.primaryJourneySlug} · Version ${revision.version}`}/><StatusLabel status={revision.status}/><section className="mt-6"><BaDocumentReader content={content} slug={workspace.slug}/></section>{allowed?<ReviewForm revisionId={revision.id}/>:<p className="mt-6 rounded-xl bg-goldPale p-4">This revision is not eligible for review by the current account.</p>}</>;
  }
  if (!identity) notFound();
  if (!isReviewDetailContentType(identity.contentItem.type)) notFound();
  const revision = await db.contentRevision.findUnique({ where: { id: revisionId }, include: { contentItem: { include: { publishedRevision: true } }, author: { select: { name: true } } } });
  if (!revision) notFound(); const allowed = canReviewRevision(user.role, user.id, revision.authorId) && revision.status === 'IN_REVIEW';
  return <><WorkspaceTitle eyebrow="Revision Review" title={revision.contentItem.slug.replaceAll('-',' ')} description={`Version ${revision.version} by ${revision.author?.name ?? 'Seed migration'}`} /><StatusLabel status={revision.status} /><div className="mt-6 grid gap-5 xl:grid-cols-2"><Panel title="Submitted revision" content={revision.contentJson} /><Panel title="Current published version" content={revision.contentItem.publishedRevision?.contentJson ?? 'No published version'} /></div>{allowed ? <ReviewForm revisionId={revision.id}/> : <p className="mt-6 rounded-xl bg-goldPale p-4">This revision is not eligible for review by the current account.</p>}</>;
}
function ReviewForm({revisionId}:{revisionId:string}){return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><form action={reviewRevisionAction}><input type="hidden" name="revisionId" value={revisionId}/><label className="font-semibold">Review note<textarea name="reviewNote" required minLength={10} rows={4} aria-describedby="review-note-help" className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal"/></label><p id="review-note-help" className="mt-1 text-xs text-slate-500">Required for Request Changes or Reject; minimum 10 characters.</p><div className="mt-4 flex flex-wrap gap-3"><button name="action" value="changes" className="min-h-11 rounded-xl border border-amber-600 px-4 font-semibold text-amber-800">Request Changes</button><button name="action" value="reject" className="min-h-11 rounded-xl border border-red-600 px-4 font-semibold text-red-700">Reject</button></div></form><form action={reviewRevisionAction} className="mt-3"><input type="hidden" name="revisionId" value={revisionId}/><button name="action" value="publish" className="min-h-11 rounded-xl bg-royalBlue px-4 font-semibold text-white">Approve and Publish</button></form></section>}
function Panel({ title, content }: { title: string; content: string }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">{title}</h2><pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap text-xs leading-5">{content}</pre></section>; }
