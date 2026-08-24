import {
  artifactIdPattern,
  type BaDocumentContentV1,
} from "./ba-document-domain";

type Artifact = {
  id: string;
  title?: string;
  name?: string;
  [key: string]: unknown;
};
export type TraceGroup =
  | "processRefs"
  | "businessRuleRefs"
  | "validationRefs"
  | "dataRefs"
  | "acceptanceCriteriaRefs"
  | "uatRefs";
const groupByKind: Record<string, TraceGroup> = {
  PROC: "processRefs",
  RULE: "businessRuleRefs",
  VAL: "validationRefs",
  DATA: "dataRefs",
  MAP: "dataRefs",
  AC: "acceptanceCriteriaRefs",
  UAT: "uatRefs",
};
const reverseFields: Record<string, TraceGroup | undefined> = {
  requirementRef: "acceptanceCriteriaRefs",
  appliesToRequirementRefs: "businessRuleRefs",
};

export function buildSameDocumentReferenceIndex(content: BaDocumentContentV1) {
  const artifacts = Object.values(content.artifacts).flatMap(
    (items) => (items ?? []) as Artifact[],
  );
  const artifactById = new Map(artifacts.map((item) => [item.id, item]));
  const incomingRefsByArtifactId = new Map<string, Set<string>>(),
    outgoingRefsByArtifactId = new Map<string, Set<string>>();
  const add = (from: string, to: string) => {
    if (!artifactById.has(to)) return;
    (
      outgoingRefsByArtifactId.get(from) ??
      outgoingRefsByArtifactId.set(from, new Set()).get(from)!
    ).add(to);
    (
      incomingRefsByArtifactId.get(to) ??
      incomingRefsByArtifactId.set(to, new Set()).get(to)!
    ).add(from);
  };
  const visit = (owner: string, value: unknown) => {
    if (Array.isArray(value)) value.forEach((item) => visit(owner, item));
    else if (value && typeof value === "object")
      Object.values(value).forEach((item) => visit(owner, item));
    else if (typeof value === "string" && artifactIdPattern.test(value))
      add(owner, value);
  };
  artifacts.forEach((item) => visit(item.id, item));
  const requirementTraceRows = (content.artifacts.requirements ?? []).map(
    (requirement) => {
      const groups: Record<TraceGroup, Set<string>> = {
        processRefs: new Set(requirement.processRefs ?? []),
        businessRuleRefs: new Set(requirement.businessRuleRefs ?? []),
        validationRefs: new Set(requirement.validationRefs ?? []),
        dataRefs: new Set(requirement.dataRefs ?? []),
        acceptanceCriteriaRefs: new Set(
          requirement.acceptanceCriteriaRefs ?? [],
        ),
        uatRefs: new Set(requirement.uatRefs ?? []),
      };
      artifacts.forEach((artifact) => {
        if (artifact.id === requirement.id) return;
        const scan = (value: unknown) => {
          if (Array.isArray(value)) return value.forEach(scan);
          if (!value || typeof value !== "object") return;
          Object.entries(value).forEach(([field, raw]) => {
            const values = Array.isArray(raw) ? raw : [raw];
            if (values.includes(requirement.id)) {
              let group = reverseFields[field];
              if (field === "requirementRefs") {
                const kind = artifact.id.match(artifactIdPattern)?.[1];
                group = kind ? groupByKind[kind] : undefined;
              }
              if (group) groups[group].add(artifact.id);
            }
            scan(raw);
          });
        };
        scan(artifact);
      });
      const broken = Object.values(groups)
        .flatMap((set) => [...set])
        .filter((id) => !artifactById.has(id));
      return {
        requirementId: requirement.id,
        ...Object.fromEntries(
          Object.entries(groups).map(([key, set]) => [key, [...set]]),
        ),
        broken,
      } as { requirementId: string; broken: string[] } & Record<
        TraceGroup,
        string[]
      >;
    },
  );
  return {
    artifactById,
    incomingRefsByArtifactId,
    outgoingRefsByArtifactId,
    requirementTraceRows,
  };
}
