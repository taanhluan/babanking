import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  WorkspaceTitle,
  StatusLabel,
} from "@/components/workspace/WorkspaceShell";
import { BaDocumentRepository } from "@/server/ba-document/ba-document-repository";
import { createBaDocumentRevisionAction } from "./actions";
function preview(value: string | null) {
  try {
    return JSON.parse(value ?? "{}") as {
      title?: string;
      documentType?: string;
      documentCode?: string;
    };
  } catch {
    return {};
  }
}
export default async function Page() {
  const user = await requireRole("CONTRIBUTOR"),
    items = await BaDocumentRepository.listContributorAuthorized(user.id);
  return (
    <>
      <WorkspaceTitle
        eyebrow="Admin · Contributor"
        title="BA Documents"
        description="One logical document per card. Create revisions inside an existing published document."
      />
      <Link
        href="/admin/contributor/ba-documents/new"
        className="inline-flex min-h-11 items-center rounded-xl bg-navy px-4 font-semibold text-white"
      >
        Create New Logical BA Document
      </Link>
      <div className="mt-6 space-y-4">
        {items.map((item) => {
          const data = preview(item.publishedRevision?.contentJson ?? item.previewJson),
            working = item.revisions[0];
          return (
            <article key={item.id} className="rounded-2xl border bg-white p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row">
                <div>
                  <p className="text-xs font-semibold uppercase text-royalBlue">
                    {data.documentCode ?? data.documentType ?? "BA Document"}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-navy">
                    {data.title ?? item.slug}
                  </h2>
                  <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="font-semibold">Primary Journey</dt>
                      <dd>{item.primaryJourney?.slug.replaceAll("-", " ")}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Latest published</dt>
                      <dd>
                        {item.publishedRevision
                          ? `v${item.publishedRevision.version}`
                          : "Not published"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Working revision</dt>
                      <dd>
                        {working
                          ? `v${working.version} · ${working.status.replaceAll("_", " ")}`
                          : "None"}
                      </dd>
                    </div>
                  </dl>
                </div>
                <StatusLabel
                  status={
                    item.isArchived
                      ? "ARCHIVED"
                      : (working?.status ??
                        (item.publishedRevision ? "PUBLISHED" : "DRAFT"))
                  }
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {working?.status === "DRAFT" ? (
                  <>
                    <Action
                      href={`/admin/contributor/ba-documents/${item.slug}`}
                    >
                      Continue Editing
                    </Action>
                    <Action
                      href={`/admin/contributor/ba-documents/${item.slug}#preview`}
                    >
                      Preview
                    </Action>
                  </>
                ) : null}
                {working?.status === "CHANGES_REQUESTED" ? (
                  <>
                    <Action
                      href={`/admin/contributor/ba-documents/${item.slug}`}
                    >
                      Continue Editing
                    </Action>
                    <Action
                      href={`/admin/contributor/ba-documents/${item.slug}#review-feedback`}
                    >
                      Review Feedback
                    </Action>
                  </>
                ) : null}
                {working?.status === "IN_REVIEW" ? (
                  <Action
                    href={`/admin/contributor/ba-documents/${item.slug}#preview`}
                  >
                    View Submitted Revision
                  </Action>
                ) : null}
                {!working && item.publishedRevision ? (
                  <>
                    <Action href={`/ba-documents/${item.slug}`}>
                      View Published
                    </Action>
                    <form action={createBaDocumentRevisionAction}>
                      <input type="hidden" name="slug" value={item.slug} />
                      <button className="min-h-11 rounded-xl bg-royalBlue px-4 font-semibold text-white">
                        Create New Revision
                      </button>
                    </form>
                  </>
                ) : null}
                <Action
                  href={`/admin/contributor/ba-documents/${item.slug}#history`}
                >
                  History
                </Action>
              </div>
            </article>
          );
        })}
        {!items.length ? (
          <p className="rounded-xl border border-dashed p-6 text-textSecondary">
            No authorized BA Documents yet.
          </p>
        ) : null}
      </div>
    </>
  );
}
function Action({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 font-semibold text-navy"
    >
      {children}
    </Link>
  );
}
