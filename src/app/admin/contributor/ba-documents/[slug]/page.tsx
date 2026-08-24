import { notFound } from "next/navigation";
import {
  WorkspaceTitle,
  StatusLabel,
} from "@/components/workspace/WorkspaceShell";
import { BaDocumentReader } from "@/components/ba-documents/BaDocumentReader";
import { roleAllowsPermission } from "@/server/access-control/role-permissions";
import { requireBaDocumentAccessBySlug } from "@/server/ba-document/ba-document-authorization";
import { parseBaDocumentContent } from "@/server/ba-document/ba-document-domain";
import { BaDocumentRepository } from "@/server/ba-document/ba-document-repository";
import { BaDocumentEditor } from "../BaDocumentEditor";
import {
  createBaDocumentRevisionAction,
  publishBaDocumentAction,
  reviewBaDocumentAction,
  submitBaDocumentAction,
} from "../actions";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ module?: string }>;
}) {
  const { slug } = await params;
  const { user, document } = await requireBaDocumentAccessBySlug(slug, "EDIT");
  const [workspace, draft] = await Promise.all([
    BaDocumentRepository.getWorkspace(document),
    BaDocumentRepository.getEditableRevision(document),
  ]);
  if (!workspace) notFound();
  const content = draft
    ? parseBaDocumentContent(JSON.parse(draft.contentJson))
    : workspace.publishedRevision
      ? parseBaDocumentContent(
          JSON.parse(workspace.publishedRevision.contentJson),
        )
      : null;
  const feedback = workspace.revisions.find(
    (revision) =>
      ["CHANGES_REQUESTED", "REJECTED"].includes(revision.status) &&
      revision.reviewNote,
  );
  return (
    <>
      <WorkspaceTitle
        eyebrow="BA Document Workspace"
        title={content?.metadata.title ?? slug}
        description={`Primary Journey is immutable: ${content?.metadata.primaryJourneySlug ?? document.primaryJourneyContentItemId}`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <StatusLabel
          status={
            workspace.isArchived
              ? "ARCHIVED"
              : (draft?.status ??
                workspace.publishedRevision?.status ??
                "DRAFT")
          }
        />
        {workspace.publishedRevision ? (
          <span className="text-sm">
            Published v{workspace.publishedRevision.version}
          </span>
        ) : (
          <span className="text-sm">Not published</span>
        )}
      </div>
      {feedback ? (
        <aside
          id="review-feedback"
          aria-label="Review feedback"
          className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950"
        >
          <p className="text-xs font-semibold uppercase tracking-wide">
            Review feedback · Read only
          </p>
          <h2 className="mt-1 text-lg font-semibold">Changes requested</h2>
          <p className="mt-2 whitespace-pre-wrap">{feedback.reviewNote}</p>
          <p className="mt-3 text-xs">
            Reviewer: {feedback.reviewer?.name ?? "Reviewer"}
            {feedback.reviewedAt
              ? ` · ${feedback.reviewedAt.toLocaleString()}`
              : ""}
          </p>
        </aside>
      ) : null}
      {!draft && workspace.publishedRevision ? (
        <form action={createBaDocumentRevisionAction} className="mt-6">
          <input type="hidden" name="slug" value={slug} />
          <button className="min-h-11 rounded-xl bg-royalBlue px-5 font-semibold text-white">Create New Revision</button>
          <p className="mt-2 text-sm text-slate-500">Clones published v{workspace.publishedRevision.version} into the next governed draft on this same document.</p>
        </form>
      ) : null}
      {draft && ["DRAFT", "CHANGES_REQUESTED"].includes(draft.status) ? (
        <div className="mt-6">
          <BaDocumentEditor
            slug={slug}
            revisionId={draft.id}
            initialJson={draft.contentJson}
          />
          <form action={submitBaDocumentAction} className="mt-4">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="revisionId" value={draft.id} />
            <button className="min-h-11 rounded-xl border border-royalBlue px-4 font-semibold text-royalBlue">
              Submit for review
            </button>
          </form>
        </div>
      ) : null}
      {draft?.status === "IN_REVIEW" ? (
        <section className="mt-6 rounded-2xl border bg-white p-5">
          <h2 className="text-xl font-semibold">Review actions</h2>
          {roleAllowsPermission(user.role, "REVIEW") ? (
            <form action={reviewBaDocumentAction} className="mt-4 space-y-3">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="revisionId" value={draft.id} />
              <textarea
                required
                minLength={10}
                name="reviewNote"
                placeholder="Required review note"
                className="w-full rounded-xl border p-3"
              />
              <div className="flex gap-3">
                <button
                  name="decision"
                  value="changes"
                  className="rounded-xl border border-amber-600 px-4 py-3 font-semibold"
                >
                  Request changes
                </button>
                <button
                  name="decision"
                  value="reject"
                  className="rounded-xl border border-red-600 px-4 py-3 font-semibold text-red-700"
                >
                  Reject
                </button>
              </div>
            </form>
          ) : null}
          {roleAllowsPermission(user.role, "PUBLISH") ? (
            <form action={publishBaDocumentAction} className="mt-4">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="revisionId" value={draft.id} />
              <button className="rounded-xl bg-royalBlue px-4 py-3 font-semibold text-white">
                Approve and publish
              </button>
            </form>
          ) : null}
        </section>
      ) : null}
      {content ? (
        <section id="preview" className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">
            {draft ? "Current draft preview" : "Published preview"}
          </h2>
          <BaDocumentReader
            content={content}
            slug={slug}
            activeModuleId={(await searchParams).module}
          />
        </section>
      ) : null}
      <section id="history" className="mt-10">
        <h2 className="text-xl font-semibold">Revision history</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr>
                <th className="p-3">Version</th>
                <th>Status</th>
                <th>Author</th>
                <th>Reviewer</th>
                <th>Created</th>
                <th>Submitted</th>
                <th>Reviewed</th>
                <th>Published</th>
                <th>Review note</th>
              </tr>
            </thead>
            <tbody>
              {workspace.revisions.map((revision) => (
                <tr key={revision.id} className="border-t">
                  <td className="p-3">v{revision.version}</td>
                  <td>{revision.status}</td>
                  <td>{revision.author?.name ?? revision.authorId ?? "Migration"}</td>
                  <td>{revision.reviewer?.name ?? "—"}</td>
                  <td>{revision.createdAt.toLocaleString()}</td>
                  <td>{revision.submittedAt?.toLocaleString() ?? "—"}</td>
                  <td>{revision.reviewedAt?.toLocaleString() ?? "—"}</td>
                  <td>{revision.publishedAt?.toLocaleString() ?? "—"}</td>
                  <td className="max-w-xs whitespace-pre-wrap">{revision.reviewNote ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
