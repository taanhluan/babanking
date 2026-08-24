import { describe, expect, it } from "vitest";
import { baDocumentTemplates } from "./ba-document-templates";
import {
  deriveAuthoringQuality,
  extractBaDocumentSearchText,
  findInboundReferences,
  removeArtifact,
  suggestArtifactId,
  validateTranslationStructure,
} from "./ba-document-authoring";
import type { BaDocumentContentV1 } from "./ba-document-domain";
const doc = () =>
  structuredClone(baDocumentTemplates.BRD_STANDARD) as BaDocumentContentV1;
describe("BA Document structured authoring", () => {
  it("suggests deterministic unused stable IDs", () => {
    const value = doc();
    expect(suggestArtifactId(value, "requirements")).toMatch(/-FR-001$/);
    value.artifacts.requirements = [
      {
        id: suggestArtifactId(value, "requirements"),
        type: "FUNCTIONAL",
        title: "T",
        description: "D",
        businessRationale: "R",
        source: { type: "STAKEHOLDER" },
        priority: "MUST",
        status: "PROPOSED",
      },
    ];
    expect(suggestArtifactId(value, "requirements")).toMatch(/-FR-002$/);
  });
  it("protects referenced artifacts from deletion", () => {
    const value = doc();
    value.artifacts.requirements = [
      {
        id: "CO-FR-001",
        type: "FUNCTIONAL",
        title: "T",
        description: "D",
        businessRationale: "R",
        source: { type: "STAKEHOLDER" },
        priority: "MUST",
        status: "PROPOSED",
        validationRefs: ["CO-VAL-001"],
      },
    ];
    value.artifacts.validations = [
      {
        id: "CO-VAL-001",
        name: "V",
        category: "OTHER",
        trigger: "T",
        condition: "C",
        validationLogic: "L",
        successOutcome: "S",
        failureOutcome: "F",
        requirementRefs: ["CO-FR-001"],
      },
    ];
    expect(findInboundReferences(value, "CO-VAL-001")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ artifactId: "CO-FR-001" }),
      ]),
    );
    expect(() => removeArtifact(value, "validations", "CO-VAL-001")).toThrow(
      /referenced/,
    );
  });
  it("derives readiness and searchable artifact text", () => {
    const value = doc();
    expect(deriveAuthoringQuality(value).readyForReview).toBe(true);
    expect(extractBaDocumentSearchText(value)).toEqual(expect.any(Array));
  });
  it("preserves stable structure across translation", () => {
    const source = doc(),
      translated = doc();
    translated.metadata.title = "Tài liệu";
    expect(validateTranslationStructure(source, translated)).toEqual({
      valid: true,
      errors: [],
    });
    translated.metadata.primaryJourneySlug = "cards";
    expect(validateTranslationStructure(source, translated).valid).toBe(false);
  });
});
