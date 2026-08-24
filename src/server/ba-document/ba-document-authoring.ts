import {
  artifactIdPattern,
  deriveBaDocumentRtm,
  type BaDocumentContentV1,
} from "./ba-document-domain";

export type ArtifactCollection = keyof BaDocumentContentV1["artifacts"];
export const artifactKinds: Record<ArtifactCollection, string> = {
  requirements: "FR",
  businessRules: "RULE",
  validations: "VAL",
  processes: "PROC",
  dataElements: "DATA",
  dataMappings: "MAP",
  acceptanceCriteria: "AC",
  uatScenarios: "UAT",
  decisions: "DEC",
};

export function documentPrefix(slug: string) {
  return (
    slug
      .split("-")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 10)
      .toUpperCase() || "DOC"
  );
}

export function suggestArtifactId(
  content: BaDocumentContentV1,
  collection: ArtifactCollection,
  requirementType?: string,
) {
  const kind =
    collection === "requirements"
      ? requirementType === "BUSINESS"
        ? "BR"
        : requirementType === "NON_FUNCTIONAL"
          ? "NFR"
          : "FR"
      : artifactKinds[collection];
  const prefix = documentPrefix(content.metadata.primaryJourneySlug);
  const used = new Set(
    Object.values(content.artifacts).flatMap((items) =>
      (items ?? []).map((item) => item.id),
    ),
  );
  let sequence = 1;
  while (used.has(`${prefix}-${kind}-${String(sequence).padStart(3, "0")}`))
    sequence += 1;
  return `${prefix}-${kind}-${String(sequence).padStart(3, "0")}`;
}

export function findInboundReferences(
  content: BaDocumentContentV1,
  artifactId: string,
) {
  const hits: Array<{ artifactId: string; field: string }> = [];
  const visit = (value: unknown, owner: string, field: string) => {
    if (Array.isArray(value))
      value.forEach((item) => visit(item, owner, field));
    else if (value && typeof value === "object")
      Object.entries(value).forEach(([key, item]) => visit(item, owner, key));
    else if (value === artifactId) hits.push({ artifactId: owner, field });
  };
  Object.values(content.artifacts).forEach((items) =>
    (items ?? []).forEach((item) => {
      if (item.id !== artifactId) visit(item, item.id, "");
    }),
  );
  return hits;
}

export function removeArtifact(
  content: BaDocumentContentV1,
  collection: ArtifactCollection,
  artifactId: string,
) {
  const inbound = findInboundReferences(content, artifactId);
  if (inbound.length)
    throw new Error(
      `${artifactId} is referenced by ${inbound.map((hit) => `${hit.artifactId}.${hit.field}`).join(", ")}`,
    );
  return {
    ...content,
    artifacts: {
      ...content.artifacts,
      [collection]: (content.artifacts[collection] ?? []).filter(
        (item) => item.id !== artifactId,
      ),
    },
  } as BaDocumentContentV1;
}

export function deriveAuthoringQuality(content: BaDocumentContentV1) {
  const rtm = deriveBaDocumentRtm(content);
  const counts = { linked: 0, partial: 0, unlinked: 0, invalid: 0 };
  rtm.forEach((row) => {
    if (row.status === "LINKED") counts.linked++;
    else if (row.status === "PARTIAL") counts.partial++;
    else if (row.status === "UNLINKED") counts.unlinked++;
    else counts.invalid++;
  });
  const total = Object.values(content.artifacts).reduce(
    (sum, entries) => sum + (entries?.length ?? 0),
    0,
  );
  const warnings = [
    ...(counts.unlinked
      ? [`${counts.unlinked} requirements have no traceability links.`]
      : []),
    ...(counts.partial
      ? [`${counts.partial} requirements are partially linked.`]
      : []),
  ];
  const blockers = counts.invalid
    ? [`${counts.invalid} requirements contain invalid references.`]
    : [];
  return {
    totalArtifacts: total,
    rtm,
    counts,
    warnings,
    blockers,
    readyForReview: blockers.length === 0 && counts.unlinked === 0,
  };
}

export function extractBaDocumentSearchText(content: BaDocumentContentV1) {
  const values: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") values.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object")
      Object.values(value).forEach(visit);
  };
  visit(content.artifacts);
  visit(content.modules);
  return values.filter((value) => !artifactIdPattern.test(value));
}

export function validateTranslationStructure(
  source: BaDocumentContentV1,
  translated: BaDocumentContentV1,
) {
  const ids = (value: BaDocumentContentV1) =>
    Object.values(value.artifacts)
      .flatMap((items) => (items ?? []).map((item) => item.id))
      .sort();
  const errors: string[] = [];
  if (source.documentType !== translated.documentType)
    errors.push("documentType must not change.");
  if (JSON.stringify(ids(source)) !== JSON.stringify(ids(translated)))
    errors.push("Stable artifact IDs must be preserved.");
  if (
    source.metadata.primaryJourneySlug !==
    translated.metadata.primaryJourneySlug
  )
    errors.push("Primary Journey must not change.");
  return { valid: errors.length === 0, errors };
}
