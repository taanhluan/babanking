"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireBaDocumentAccessBySlug } from "@/server/ba-document/ba-document-authorization";
import { db } from "@/lib/db";
import { evaluateContentAccessForUser } from "@/server/access-control/knowledge-access-repository";
import {
  validateBaDocumentJson,
  type BaDocumentValidationResult,
} from "@/server/ba-document/ba-document-validation";
import { baDocumentTemplates } from "@/server/ba-document/ba-document-templates";
import {
  createBaDocument,
  createBaDocumentDraftFromPublished,
  publishBaDocumentRevision,
  reviewBaDocumentRevision,
  saveBaDocumentDraft,
  submitBaDocumentRevision,
} from "@/server/ba-document/ba-document-service";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const revisionId = z.string().cuid();
const templateName = z.enum([
  "BRD_STANDARD",
  "REQUIREMENT_SPECIFICATION_STANDARD",
  "PROCESS_SPECIFICATION_STANDARD",
  "DATA_SPECIFICATION_STANDARD",
  "UAT_SPECIFICATION_STANDARD",
]);
const text = z.string().trim().min(1);

export async function createBaDocumentAction(formData: FormData) {
  const input = {
    slug: slug.parse(formData.get("slug")),
    primaryJourneyContentItemId: z
      .string()
      .cuid()
      .parse(formData.get("primaryJourneyContentItemId")),
    template: templateName.parse(formData.get("template")),
    documentCode: text.parse(formData.get("documentCode")),
    title: text.parse(formData.get("title")),
    summary: z.string().trim().min(30).parse(formData.get("summary")),
  };
  const user = await import("@/lib/auth").then(({ requireRole }) =>
    requireRole("CONTRIBUTOR"),
  );
  const primaryAccess = await evaluateContentAccessForUser(
    user.id,
    input.primaryJourneyContentItemId,
    "EDIT",
  );
  if (!primaryAccess?.allowed)
    throw new Error("Primary Journey permission denied.");
  const primaryJourney = await db.contentItem.findUnique({
    where: { id: input.primaryJourneyContentItemId, type: "BANKING_JOURNEY" },
    select: { slug: true },
  });
  if (!primaryJourney) throw new Error("Primary Journey not found.");
  const content = structuredClone(baDocumentTemplates[input.template]);
  content.metadata = {
    ...content.metadata,
    documentCode: input.documentCode,
    title: input.title,
    summary: input.summary,
    primaryJourneySlug: primaryJourney.slug,
  };
  await createBaDocument(
    {
      slug: input.slug,
      primaryJourneyContentItemId: input.primaryJourneyContentItemId,
      contentJson: JSON.stringify(content),
    },
    user,
  );
  revalidatePath("/admin/contributor/ba-documents");
  redirect(`/admin/contributor/ba-documents/${input.slug}`);
}

export async function saveBaDocumentAction(formData: FormData) {
  const documentSlug = slug.parse(formData.get("slug"));
  const id = revisionId.parse(formData.get("revisionId"));
  const json = z.string().min(2).parse(formData.get("contentJson"));
  const validation = validateBaDocumentJson(json);
  if (validation.status !== "VALID") return { ok: false as const, validation };
  const { user, document } = await requireBaDocumentAccessBySlug(
    documentSlug,
    "EDIT",
  );
  await saveBaDocumentDraft(document.id, id, json, user);
  revalidatePath(`/admin/contributor/ba-documents/${documentSlug}`);
  return { ok: true as const };
}

export async function createBaDocumentRevisionAction(formData: FormData) {
  const documentSlug = slug.parse(formData.get("slug"));
  const { user, document } = await requireBaDocumentAccessBySlug(
    documentSlug,
    "EDIT",
  );
  await createBaDocumentDraftFromPublished(document.id, user);
  revalidatePath("/admin/contributor/ba-documents");
  revalidatePath(`/admin/contributor/ba-documents/${documentSlug}`);
  redirect(`/admin/contributor/ba-documents/${documentSlug}`);
}

export type SaveBaDocumentActionResult =
  { ok: true } | { ok: false; validation: BaDocumentValidationResult };

export async function submitBaDocumentAction(formData: FormData) {
  const documentSlug = slug.parse(formData.get("slug")),
    id = revisionId.parse(formData.get("revisionId"));
  const { user, document } = await requireBaDocumentAccessBySlug(
    documentSlug,
    "EDIT",
  );
  await submitBaDocumentRevision(document.id, id, user);
  revalidatePath(`/admin/contributor/ba-documents/${documentSlug}`);
}

export async function reviewBaDocumentAction(formData: FormData) {
  const documentSlug = slug.parse(formData.get("slug")),
    id = revisionId.parse(formData.get("revisionId")),
    decision = z.enum(["changes", "reject"]).parse(formData.get("decision")),
    note = z.string().trim().min(10).parse(formData.get("reviewNote"));
  const { user, document } = await requireBaDocumentAccessBySlug(
    documentSlug,
    "REVIEW",
  );
  await reviewBaDocumentRevision(document.id, id, decision, note, user);
  revalidatePath(`/admin/contributor/ba-documents/${documentSlug}`);
}

export async function publishBaDocumentAction(formData: FormData) {
  const documentSlug = slug.parse(formData.get("slug")),
    id = revisionId.parse(formData.get("revisionId"));
  const { user, document } = await requireBaDocumentAccessBySlug(
    documentSlug,
    "PUBLISH",
  );
  await publishBaDocumentRevision(document.id, id, user);
  revalidatePath("/ba-documents");
  revalidatePath(`/ba-documents/${documentSlug}`);
  revalidatePath(`/admin/contributor/ba-documents/${documentSlug}`);
}
