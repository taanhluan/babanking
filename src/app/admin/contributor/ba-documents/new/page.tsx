import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspaceTitle } from "@/components/workspace/WorkspaceShell";
import { getAccessibleContentIds } from "@/server/access-control/knowledge-access-repository";
import { createBaDocumentAction } from "../actions";
// Security invariant: getAccessibleContentIds(user.id,{type:'BANKING_JOURNEY',permission:'EDIT'})
export default async function Page() {
  const user = await requireRole("CONTRIBUTOR");
  const ids = await getAccessibleContentIds(user.id, {
    type: "BANKING_JOURNEY",
    permission: "EDIT",
  });
  const journeys = await db.contentItem.findMany({
    where: { id: { in: ids }, type: "BANKING_JOURNEY", isArchived: false },
    orderBy: { slug: "asc" },
    select: { id: true, slug: true, previewJson: true },
  });
  return (
    <>
      <WorkspaceTitle
        eyebrow="BA Documentation"
        title="Create BA Document"
        description="Three guided steps create a governed draft; nothing is published automatically."
      />
      {journeys.length ? (
        <form action={createBaDocumentAction} className="space-y-5">
          <Step number="1" title="Choose the business context">
            <label className="block font-semibold">
              Primary Journey
              <select
                name="primaryJourneyContentItemId"
                className="mt-2 min-h-11 w-full rounded-xl border px-3"
              >
                {journeys.map((journey) => (
                  <option key={journey.id} value={journey.id}>
                    {journey.slug.replaceAll("-", " ")}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                Only Journeys you can edit are shown. This stable relation
                cannot change after the first revision.
              </span>
            </label>
          </Step>
          <Step number="2" title="Choose a governed starting point">
            <label className="block font-semibold">
              Document template
              <select
                name="template"
                className="mt-2 min-h-11 w-full rounded-xl border px-3"
              >
                <option value="BRD_STANDARD">
                  BRD — business needs and scope
                </option>
                <option value="REQUIREMENT_SPECIFICATION_STANDARD">
                  Requirement Specification — detailed requirements
                </option>
                <option value="PROCESS_SPECIFICATION_STANDARD">
                  Process Specification — process and responsibilities
                </option>
                <option value="DATA_SPECIFICATION_STANDARD">
                  Data Specification — data definitions and mappings
                </option>
                <option value="UAT_SPECIFICATION_STANDARD">
                  UAT Specification — acceptance and testing
                </option>
              </select>
            </label>
          </Step>
          <Step number="3" title="Identify the document">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                name="documentCode"
                label="Document code"
                help="A business-facing code, for example ONB-BRD-001."
              />
              <Field
                name="slug"
                label="Stable document slug"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                help="Lowercase words separated by hyphens; this becomes the permanent URL."
              />
              <Field
                name="title"
                label="Title"
                help="A clear, specific document name."
              />
            </div>
            <label className="mt-4 block font-semibold">
              Summary
              <textarea
                required
                minLength={30}
                name="summary"
                rows={4}
                className="mt-2 w-full rounded-xl border p-3 font-normal"
              />
              <span className="block text-xs font-normal text-slate-500">
                At least 30 characters describing purpose, scope, and audience.
              </span>
            </label>
          </Step>
          <button className="min-h-11 rounded-xl bg-royalBlue px-5 font-semibold text-white">
            Create governed draft
          </button>
        </form>
      ) : (
        <p className="rounded-xl border border-dashed p-6">
          No Journey with EDIT permission is available.
        </p>
      )}
    </>
  );
}
function Field({
  name,
  label,
  pattern,
  help,
}: {
  name: string;
  label: string;
  pattern?: string;
  help: string;
}) {
  return (
    <label className="block font-semibold">
      {label}
      <input
        required
        name={name}
        pattern={pattern}
        className="mt-2 min-h-11 w-full rounded-xl border px-3 font-normal"
      />
      <span className="block text-xs font-normal text-slate-500">{help}</span>
    </label>
  );
}
function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">
        <span className="mr-2 inline-grid size-8 place-items-center rounded-full bg-royalBlue text-white">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
