import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BaDocumentReader } from "./BaDocumentReader";
import { baDocumentTemplates } from "@/server/ba-document/ba-document-templates";
import type { BaDocumentContentV1 } from "@/server/ba-document/ba-document-domain";
import { buildSameDocumentReferenceIndex } from "@/server/ba-document/ba-document-traceability";
function content() {
  const value = structuredClone(
    baDocumentTemplates.BRD_STANDARD,
  ) as BaDocumentContentV1;
  value.artifacts.requirements = [
    {
      id: "CO-FR-001",
      type: "FUNCTIONAL",
      title: "Identity verification",
      description: "Verify customer identity.",
      businessRationale:
        "[SOURCE REQUIRED] Business rationale was not provided in the original payload.",
      source: {
        type: "JOURNEY_REFERENCE",
        description: "Customer Onboarding Journey – Identity Verification",
      },
      priority: "MUST",
      status: "PROPOSED",
    },
  ];
  value.artifacts.businessRules = [
    {
      id: "CO-RULE-001",
      name: "Verification rule",
      description: "Apply approved controls.",
      ruleOrigin: "PROJECT_SPECIFIC_RULE",
      decision: "Verify evidence.",
      outcome: "Verification result.",
      sourceType: "STAKEHOLDER",
      appliesToRequirementRefs: ["CO-FR-001"],
    },
  ];
  value.artifacts.processes = [
    {
      id: "CO-PROC-001",
      name: "Verify identity",
      purpose:
        "[SOURCE REQUIRED] Process purpose was not provided in the original payload.",
      actors: ["Customer", "eKYC Service"],
      preconditions: ["Application exists"],
      trigger: "Evidence submitted",
      steps: [
        {
          id: "STEP-01",
          name: "Perform Verification",
          laneId: "eKYC Service",
          responsibility: "Verify evidence.",
          description: "Run approved checks.",
          requirementRefs: ["CO-FR-001"],
        },
      ],
      outcomes: ["Identity result produced"],
      requirementRefs: ["CO-FR-001"],
    },
  ];
  value.artifacts.acceptanceCriteria = [
    {
      id: "CO-AC-001",
      requirementRef: "CO-FR-001",
      title: "Verification succeeds",
      format: "BUSINESS_READABLE",
      expectedOutcome: "Valid evidence is accepted.",
    },
  ];
  value.artifacts.uatScenarios = [
    {
      id: "CO-UAT-001",
      title: "Verify valid evidence",
      objective: "Confirm verification.",
      requirementRefs: ["CO-FR-001"],
      acceptanceCriteriaRefs: ["CO-AC-001"],
      steps: [
        {
          order: 0,
          action: "Submit valid evidence",
          expectedResult: "Evidence is accepted",
        },
      ],
      expectedResult: "Verification succeeds.",
      priority: "HIGH",
    },
  ];
  return value;
}
describe("BA Document business reader", () => {
  it("reuses responsive Journey navigation and renders governed blocks", () => {
    const value = structuredClone(baDocumentTemplates.BRD_STANDARD);
    value.modules[0]!.sections[0]!.blocks = [
      {id:"rich",schemaVersion:1,blockType:"RICH_TEXT",payload:{text:"Project-specific analysis"}},
      {id:"table",schemaVersion:1,blockType:"TABLE",payload:{headers:["Field","Value"],rows:[["Status","Ready"]]}},
    ];
    const html=renderToStaticMarkup(<BaDocumentReader content={value} slug="pilot-brd"/>);
    expect(html).toContain("Journey Navigator");
    expect(html).toContain("Project-specific analysis");
    expect(html).toContain("Requirements Traceability Matrix");
    expect(html).toContain("Same-document traceability only");
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("Next:");
  });
  it("labels canonical Journey references without copying definitions",()=>{
    const value=structuredClone(baDocumentTemplates.BRD_STANDARD);
    value.references={journeyKnowledge:[{journeySlug:"cards",referenceKind:"RULE",referenceId:"eligibility",displayLabel:"Card eligibility rule"}]};
    const html=renderToStaticMarkup(<BaDocumentReader content={value} slug="pilot-brd"/>);
    expect(html).toContain("Canonical Journey Reference");expect(html).toContain("/banking-journeys/cards");expect(html).toContain("Card eligibility rule");
  });
  it("renders known nested structures semantically without raw JSON", () => {
    const html = renderToStaticMarkup(
      <BaDocumentReader content={content()} slug="customer-onboarding-brd" />,
    );
    expect(html).toContain("Journey Reference");
    expect(html).toContain(
      "Customer Onboarding Journey – Identity Verification",
    );
    expect(html).toContain("Perform Verification");
    expect(html).toContain("eKYC Service");
    expect(html).toContain("Application exists");
    expect(html).toContain("Identity result produced");
    expect(html).toContain("Step 1");
    expect(html).toContain("CO-FR-001 — Identity verification");
    expect(html).toContain("Needs BA confirmation");
    expect(html).not.toContain("[SOURCE REQUIRED]");
    expect(html).not.toContain("original payload");
    expect(html).not.toContain("{&quot;id&quot;:");
    expect(html).not.toContain("{&quot;type&quot;:");
  });
  it("derives same-document reverse traceability without unrelated inference", () => {
    const index = buildSameDocumentReferenceIndex(content()),
      row = index.requirementTraceRows[0]!;
    expect(row.acceptanceCriteriaRefs).toContain("CO-AC-001");
    expect(row.uatRefs).toContain("CO-UAT-001");
    expect(row.businessRuleRefs).toContain("CO-RULE-001");
    expect(row.processRefs).toContain("CO-PROC-001");
    expect(row.validationRefs).toEqual([]);
  });
  it("keeps broken forward references visible", () => {
    const value = content();
    value.artifacts.requirements![0]!.validationRefs = ["CO-VAL-099"];
    const row = buildSameDocumentReferenceIndex(value).requirementTraceRows[0]!;
    expect(row.validationRefs).toEqual(["CO-VAL-099"]);
    expect(row.broken).toEqual(["CO-VAL-099"]);
  });
});
