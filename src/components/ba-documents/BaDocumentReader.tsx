import Link from "next/link";
import {
  JourneyReaderLayout,
  SectionNavigator,
  BackToTop,
} from "@/components/journeys/JourneyNavigator";
import { JourneyBlockRenderer } from "@/components/journeys/blocks/JourneyBlockRenderer";
import { buildStageHref } from "@/components/journeys/journey-navigation";
import type { BaDocumentContentV1 } from "@/server/ba-document/ba-document-domain";
import { buildSameDocumentReferenceIndex } from "@/server/ba-document/ba-document-traceability";
type Artifact = {
  id: string;
  title?: string;
  name?: string;
  [key: string]: unknown;
};
const labels: Record<string, string> = {
  FUNCTIONAL: "Functional Requirement",
  NON_FUNCTIONAL: "Non-Functional Requirement",
  BUSINESS: "Business Requirement",
  MUST: "Must",
  SHOULD: "Should",
  COULD: "Could",
  WONT_V1: "Won't in V1",
  PROPOSED: "Proposed",
  AGREED: "Agreed",
  DEFERRED: "Deferred",
  REJECTED: "Rejected",
  JOURNEY_REFERENCE: "Journey Reference",
  PROJECT_DECISION: "Project Decision",
  REGULATION: "Regulatory Requirement",
  STAKEHOLDER: "Stakeholder Input",
  OTHER: "Other",
  REFERENCE_TO_CANONICAL_JOURNEY_RULE: "Canonical Journey Rule",
  PROJECT_SPECIFIC_RULE: "Project-Specific Rule",
  BUSINESS_READABLE: "Business Outcome",
};
const human = (value: string) =>
  labels[value] ??
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());
const unresolved = (value: unknown) =>
  typeof value === "string" &&
  (value.includes("[SOURCE REQUIRED]") ||
    value.toLowerCase().includes("original payload") ||
    value.toLowerCase().includes("was not provided"));
function Text({ value }: { value: unknown }) {
  if (value == null || value === "")
    return <span className="text-slate-500">No information documented</span>;
  if (unresolved(value)) return <Unresolved />;
  if (typeof value === "string" || typeof value === "number")
    return <>{String(value)}</>;
  return <span className="text-amber-800">Unsupported structured content</span>;
}
function Unresolved() {
  return (
    <span className="inline-flex rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900">
      Needs BA confirmation
    </span>
  );
}
function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap leading-7 text-textPrimary">
        <Text value={value} />
      </dd>
    </div>
  );
}
function Pills({ items }: { items?: string[] }) {
  return items?.length ? (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
          {item}
        </li>
      ))}
    </ul>
  ) : (
    <span className="text-sm text-slate-500">No information documented</span>
  );
}
function Ref({
  id,
  index,
}: {
  id: string;
  index: ReturnType<typeof buildSameDocumentReferenceIndex>;
}) {
  const item = index.artifactById.get(id);
  return (
    <a
      href={`#artifact-${id}`}
      className={`block font-semibold ${item ? "text-royalBlue" : "text-red-700"}`}
    >
      {id}
      {item
        ? ` — ${item.title ?? item.name ?? "Untitled"}`
        : " — Broken reference"}
    </a>
  );
}
function Refs({
  label,
  ids,
  index,
}: {
  label: string;
  ids?: string[];
  index: ReturnType<typeof buildSameDocumentReferenceIndex>;
}) {
  return (
    <div>
      <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </h5>
      <div className="mt-1 space-y-1">
        {ids?.length ? (
          ids.map((id) => <Ref key={id} id={id} index={index} />)
        ) : (
          <span className="text-sm text-slate-500">
            No relationship documented
          </span>
        )}
      </div>
    </div>
  );
}
function Card({
  item,
  children,
}: {
  item: Artifact;
  children: React.ReactNode;
}) {
  return (
    <article
      id={`artifact-${item.id}`}
      className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h4 className="text-lg font-semibold text-navy">
        {item.id} — {item.title ?? item.name ?? "Untitled"}
      </h4>
      {children}
    </article>
  );
}
function Source({ source }: { source: unknown }) {
  if (!source || typeof source !== "object" || Array.isArray(source))
    return <Text value={source} />;
  const value = source as { type?: string; ref?: string; description?: string };
  return (
    <div>
      {value.type ? (
        <span className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-royalBlue">
          {human(value.type)}
        </span>
      ) : null}
      <div>
        <Text value={value.description ?? value.ref} />
      </div>
    </div>
  );
}
function Requirements({
  items,
  index,
}: {
  items: Artifact[];
  index: ReturnType<typeof buildSameDocumentReferenceIndex>;
}) {
  return (
    <Catalogue title="Requirements">
      {items.map((r) => (
        <Card key={r.id} item={r}>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <b>{human(String(r.type))}</b>
            <span>Priority: {human(String(r.priority))}</span>
            <span>Status: {human(String(r.status))}</span>
          </div>
          <dl className="mt-5 grid gap-5 lg:grid-cols-2">
            <Field label="Requirement" value={r.description} />
            <Field label="Business rationale" value={r.businessRationale} />
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Source
              </dt>
              <dd className="mt-1">
                <Source source={r.source} />
              </dd>
            </div>
            <Field label="Owner" value={r.owner} />
          </dl>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Refs
              label="Processes"
              ids={r.processRefs as string[] | undefined}
              index={index}
            />
            <Refs
              label="Business rules"
              ids={r.businessRuleRefs as string[] | undefined}
              index={index}
            />
            <Refs
              label="Validations"
              ids={r.validationRefs as string[] | undefined}
              index={index}
            />
            <Refs
              label="Data"
              ids={r.dataRefs as string[] | undefined}
              index={index}
            />
            <Refs
              label="Acceptance criteria"
              ids={r.acceptanceCriteriaRefs as string[] | undefined}
              index={index}
            />
            <Refs
              label="UAT"
              ids={r.uatRefs as string[] | undefined}
              index={index}
            />
          </div>
        </Card>
      ))}
    </Catalogue>
  );
}
function Rules({
  items,
  index,
}: {
  items: Artifact[];
  index: ReturnType<typeof buildSameDocumentReferenceIndex>;
}) {
  return (
    <Catalogue title="Business Rules">
      {items.map((r) => (
        <Card key={r.id} item={r}>
          <div className="mt-3">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold">
              {human(String(r.ruleOrigin))}
            </span>
          </div>
          <dl className="mt-5 grid gap-5 lg:grid-cols-2">
            <Field label="Description" value={r.description} />
            <Field label="Condition" value={r.condition} />
            <Field label="Decision" value={r.decision} />
            <Field label="Outcome" value={r.outcome} />
            <Field label="Source" value={r.sourceRef} />
            <Field label="Notes" value={r.notes} />
          </dl>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Refs
              label="Applicable requirements"
              ids={r.appliesToRequirementRefs as string[] | undefined}
              index={index}
            />
            <Refs
              label="Validations"
              ids={r.validationRefs as string[] | undefined}
              index={index}
            />
          </div>
        </Card>
      ))}
    </Catalogue>
  );
}
function Validations({
  items,
  index,
}: {
  items: Artifact[];
  index: ReturnType<typeof buildSameDocumentReferenceIndex>;
}) {
  return (
    <Catalogue title="Validations">
      {items.map((v) => (
        <Card key={v.id} item={v}>
          <p className="mt-2 text-sm font-semibold text-royalBlue">
            {human(String(v.category))}
          </p>
          <dl className="mt-5 grid gap-5 lg:grid-cols-2">
            <Field label="Trigger" value={v.trigger} />
            <Field label="Condition" value={v.condition} />
            <Field label="Validation logic" value={v.validationLogic} />
            <Field label="Success outcome" value={v.successOutcome} />
            <Field label="Failure outcome" value={v.failureOutcome} />
            <Field label="Error guidance" value={v.errorMessageGuidance} />
            <Field label="Exception handling" value={v.exceptionHandling} />
            <Field label="Notes" value={v.notes} />
          </dl>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Refs
              label="Requirements"
              ids={v.requirementRefs as string[] | undefined}
              index={index}
            />
            <Refs
              label="Processes"
              ids={v.processRefs as string[] | undefined}
              index={index}
            />
            <Refs
              label="Rules"
              ids={v.ruleRefs as string[] | undefined}
              index={index}
            />
            <Refs
              label="Data"
              ids={v.dataRefs as string[] | undefined}
              index={index}
            />
          </div>
        </Card>
      ))}
    </Catalogue>
  );
}
function Processes({
  items,
  index,
}: {
  items: Artifact[];
  index: ReturnType<typeof buildSameDocumentReferenceIndex>;
}) {
  return (
    <Catalogue title="Processes">
      {items.map((p) => (
        <Card key={p.id} item={p}>
          <dl className="mt-5 grid gap-5 lg:grid-cols-2">
            <Field label="Purpose" value={p.purpose} />
            <Field label="Trigger" value={p.trigger} />
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Actors
              </dt>
              <dd className="mt-2">
                <Pills items={p.actors as string[] | undefined} />
              </dd>
            </div>
            <List label="Preconditions" items={p.preconditions} />
          </dl>
          <Steps steps={p.steps} />
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <List label="Decisions" items={p.decisions} />
            <List label="Exceptions" items={p.exceptions} />
            <List label="Rework" items={p.rework} />
            <List label="Outcomes" items={p.outcomes} />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Refs
              label="Requirements"
              ids={p.requirementRefs as string[] | undefined}
              index={index}
            />
            <Refs
              label="Rules"
              ids={p.businessRuleRefs as string[] | undefined}
              index={index}
            />
            <Refs
              label="Validations"
              ids={p.validationRefs as string[] | undefined}
              index={index}
            />
          </div>
        </Card>
      ))}
    </Catalogue>
  );
}
function Steps({ steps }: { steps: unknown }) {
  const rows = Array.isArray(steps)
    ? (steps.filter((x) => x && typeof x === "object") as Array<
        Record<string, unknown>
      >)
    : [];
  return (
    <div className="mt-6">
      <h5 className="font-semibold">Process Steps</h5>
      <div className="mt-2 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                "#",
                "Lane / Actor",
                "Activity",
                "Responsibility",
                "Description",
                "Outcome",
              ].map((x) => (
                <th className="p-3" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={String(s.id ?? i)} className="border-t align-top">
                <td className="p-3">{i + 1}</td>
                <td className="p-3">
                  <Text value={s.laneId ?? s.actor} />
                </td>
                <td className="p-3 font-semibold">
                  <Text value={s.name ?? s.activity} />
                </td>
                <td className="p-3">
                  <Text value={s.responsibility} />
                </td>
                <td className="p-3">
                  <Text value={s.description} />
                </td>
                <td className="p-3">
                  <Text value={s.outcome ?? s.expectedResult} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function List({ label, items }: { label: string; items: unknown }) {
  const values = Array.isArray(items) ? items : [];
  return (
    <div>
      <h5 className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </h5>
      {values.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {values.map((item, i) => (
            <li key={i}>
              {typeof item === "string" ? (
                <Text value={item} />
              ) : item && typeof item === "object" ? (
                <Text
                  value={
                    (item as Record<string, unknown>).description ??
                    (item as Record<string, unknown>).name ??
                    (item as Record<string, unknown>).outcome
                  }
                />
              ) : (
                <Text value={item} />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-slate-500">No information documented</p>
      )}
    </div>
  );
}
function Data({
  elements,
  mappings,
  index,
}: {
  elements: Artifact[];
  mappings: Artifact[];
  index: ReturnType<typeof buildSameDocumentReferenceIndex>;
}) {
  return (
    <>
      <Catalogue title="Data Dictionary">
        {elements.map((d) => (
          <Card key={d.id} item={d}>
            <dl className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Business definition" value={d.businessDefinition} />
              <Field label="Data type" value={human(String(d.dataType))} />
              <Field label="Format" value={d.format} />
              <Field
                label="Mandatory"
                value={d.mandatory === true ? "Yes" : "No"}
              />
              <Field
                label="Classification"
                value={human(String(d.classification))}
              />
              <Field
                label="Sensitivity"
                value={
                  Array.isArray(d.sensitivity)
                    ? d.sensitivity.join(", ")
                    : d.sensitivity
                }
              />
              <Field label="Source system" value={d.sourceSystem} />
              <Field label="Target system" value={d.targetSystem} />
            </dl>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Refs
                label="Requirements"
                ids={d.requirementRefs as string[] | undefined}
                index={index}
              />
              <Refs
                label="Validations"
                ids={d.validationRefs as string[] | undefined}
                index={index}
              />
            </div>
          </Card>
        ))}
      </Catalogue>
      <Catalogue title="Data Mapping">
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "ID",
                  "Source System",
                  "Source Entity",
                  "Source Field",
                  "Transformation",
                  "Target System",
                  "Target Entity",
                  "Target Field",
                ].map((x) => (
                  <th key={x} className="p-3">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr id={`artifact-${m.id}`} key={m.id} className="border-t">
                  <td className="p-3 font-semibold">{m.id}</td>
                  {[
                    "sourceSystem",
                    "sourceEntity",
                    "sourceField",
                    "transformationRule",
                    "targetSystem",
                    "targetEntity",
                    "targetField",
                  ].map((k) => (
                    <td key={k} className="p-3">
                      <Text value={m[k]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Catalogue>
    </>
  );
}
function Acceptance({
  items,
  index,
}: {
  items: Artifact[];
  index: ReturnType<typeof buildSameDocumentReferenceIndex>;
}) {
  return (
    <Catalogue title="Acceptance Criteria">
      {items.map((a) => (
        <Card key={a.id} item={a}>
          <div className="mt-4">
            <Refs
              label="Requirement"
              ids={
                typeof a.requirementRef === "string" ? [a.requirementRef] : []
              }
              index={index}
            />
          </div>
          <dl className="mt-5 grid gap-5 lg:grid-cols-3">
            {a.format === "BDD" ? (
              <>
                <Field label="Given" value={a.given} />
                <Field label="When" value={a.when} />
                <Field label="Then" value={a.then} />
              </>
            ) : null}
            <Field label="Expected outcome" value={a.expectedOutcome} />
            <Field label="Notes" value={a.notes} />
          </dl>
        </Card>
      ))}
    </Catalogue>
  );
}
function Uat({
  items,
  index,
}: {
  items: Artifact[];
  index: ReturnType<typeof buildSameDocumentReferenceIndex>;
}) {
  return (
    <Catalogue title="UAT Specifications">
      {items.map((u) => (
        <Card key={u.id} item={u}>
          <p className="mt-2 text-sm font-semibold">
            Priority: {human(String(u.priority))}
          </p>
          <dl className="mt-5 grid gap-5 lg:grid-cols-2">
            <Field label="Objective" value={u.objective} />
            <Field label="Expected result" value={u.expectedResult} />
            <List label="Preconditions" items={u.preconditions} />
            <List label="Test data" items={u.testData} />
            <Field label="Notes" value={u.notes} />
          </dl>
          <UatSteps steps={u.steps} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Refs
              label="Requirements"
              ids={u.requirementRefs as string[] | undefined}
              index={index}
            />
            <Refs
              label="Acceptance criteria"
              ids={u.acceptanceCriteriaRefs as string[] | undefined}
              index={index}
            />
            <Refs
              label="Rules"
              ids={u.businessRuleRefs as string[] | undefined}
              index={index}
            />
            <Refs
              label="Validations"
              ids={u.validationRefs as string[] | undefined}
              index={index}
            />
          </div>
        </Card>
      ))}
    </Catalogue>
  );
}
function UatSteps({ steps }: { steps: unknown }) {
  const rows = Array.isArray(steps)
    ? (steps as Array<Record<string, unknown>>)
    : [];
  return (
    <div className="mt-5">
      <h5 className="font-semibold">Test steps</h5>
      <ol className="mt-2 space-y-2">
        {rows.map((s, i) => (
          <li key={i} className="rounded-xl bg-slate-50 p-3">
            <b>Step {Number(s.order ?? i) + 1}</b>
            <p>
              <Text value={s.action} />
            </p>
            <p className="text-sm">
              <b>Expected: </b>
              <Text value={s.expectedResult} />
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
function Decisions({
  items,
  index,
}: {
  items: Artifact[];
  index: ReturnType<typeof buildSameDocumentReferenceIndex>;
}) {
  return (
    <Catalogue title="Decisions">
      {items.map((d) => (
        <Card key={d.id} item={d}>
          <dl className="mt-5 grid gap-5 lg:grid-cols-2">
            <Field label="Decision" value={d.decision} />
            <Field label="Rationale" value={d.rationale} />
            <Field label="Notes" value={d.notes} />
          </dl>
          <div className="mt-5">
            <Refs
              label="Related requirements"
              ids={d.relatedRequirementRefs as string[] | undefined}
              index={index}
            />
          </div>
        </Card>
      ))}
    </Catalogue>
  );
}
function Catalogue({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9">
      <h3 className="text-xl font-semibold text-navy">{title}</h3>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}
function Artifacts({ content }: { content: BaDocumentContentV1 }) {
  const a = content.artifacts,
    index = buildSameDocumentReferenceIndex(content);
  return (
    <section className="mt-10" aria-labelledby="artifact-catalogue">
      <h2 id="artifact-catalogue" className="text-2xl font-semibold text-navy">
        Business Analysis Artifacts
      </h2>
      <Requirements
        items={(a.requirements ?? []) as Artifact[]}
        index={index}
      />
      <Rules items={(a.businessRules ?? []) as Artifact[]} index={index} />
      <Validations items={(a.validations ?? []) as Artifact[]} index={index} />
      <Processes items={(a.processes ?? []) as Artifact[]} index={index} />
      <Data
        elements={(a.dataElements ?? []) as Artifact[]}
        mappings={(a.dataMappings ?? []) as Artifact[]}
        index={index}
      />
      <Acceptance
        items={(a.acceptanceCriteria ?? []) as Artifact[]}
        index={index}
      />
      <Uat items={(a.uatScenarios ?? []) as Artifact[]} index={index} />
      <Decisions items={(a.decisions ?? []) as Artifact[]} index={index} />
    </section>
  );
}
function Traceability({ content }: { content: BaDocumentContentV1 }) {
  const index = buildSameDocumentReferenceIndex(content),
    columns: Array<
      [string, keyof (typeof index.requirementTraceRows)[number]]
    > = [
      ["Process", "processRefs"],
      ["Business Rule", "businessRuleRefs"],
      ["Validation", "validationRefs"],
      ["Data", "dataRefs"],
      ["Acceptance Criteria", "acceptanceCriteriaRefs"],
      ["UAT", "uatRefs"],
    ];
  return (
    <section className="mt-10" aria-labelledby="rtm">
      <h2 id="rtm" className="text-2xl font-semibold text-navy">
        Requirements Traceability Matrix
      </h2>
      <p className="mt-1 text-sm text-textSecondary">
        Same-document traceability only. Cross-document completeness is not
        represented.
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Requirement</th>
              {columns.map(([h]) => (
                <th key={h} className="p-3">
                  {h}
                </th>
              ))}
              <th className="p-3">Integrity</th>
            </tr>
          </thead>
          <tbody>
            {index.requirementTraceRows.map((row) => (
              <tr key={row.requirementId} className="border-t align-top">
                <td className="p-3">
                  <Ref id={row.requirementId} index={index} />
                </td>
                {columns.map(([h, k]) => (
                  <td key={h} className="p-3">
                    {(row[k] as string[]).length ? (
                      (row[k] as string[]).map((id) => (
                        <Ref key={id} id={id} index={index} />
                      ))
                    ) : (
                      <span className="text-slate-500">
                        —
                        <span className="block text-xs">
                          No relationship documented
                        </span>
                      </span>
                    )}
                  </td>
                ))}
                <td className="p-3">
                  {row.broken.length ? (
                    <span className="font-semibold text-red-700">
                      Broken: {row.broken.join(", ")}
                    </span>
                  ) : (
                    <span className="font-semibold text-green-700">Valid</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export function BaDocumentReader({
  content,
  slug,
  activeModuleId,
}: {
  content: BaDocumentContentV1;
  slug: string;
  activeModuleId?: string;
}) {
  const modules = [...content.modules].sort((a, b) => a.order - b.order),
    active = modules.find((m) => m.id === activeModuleId) ?? modules[0],
    navigation = { basePath: `ba-documents/${slug}`, stageQueryKey: "module" },
    links = modules.map((m) => ({
      id: m.id,
      title: m.title,
      sectionCount: m.sections.length,
      sections: m.sections.map((s) => ({ id: s.id, title: s.title })),
    })),
    index = active ? modules.findIndex((m) => m.id === active.id) : -1;
  return (
    <>
      <JourneyReaderLayout
        stages={links}
        selectedStage={active?.id ?? ""}
        navigation={navigation}
      >
        {active ? (
          <article className="min-w-0 overflow-hidden rounded-2xl border bg-white p-4 sm:p-6">
            <p className="text-xs font-semibold uppercase text-royalBlue">
              Module {index + 1} of {modules.length}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-navy">
              {active.title}
            </h2>
            {active.summary ? (
              <p className="mt-2 text-textSecondary">{active.summary}</p>
            ) : null}
            <SectionNavigator
              sections={active.sections.map((s) => ({
                id: s.id,
                title: s.title,
              }))}
            />
            <div className="mt-5 space-y-7">
              {[...active.sections]
                .sort((a, b) => a.order - b.order)
                .map((s) => (
                  <section
                    id={`state-${s.id}`}
                    key={s.id}
                    className="scroll-mt-36 border-t pt-5"
                  >
                    <h3 className="text-xl font-semibold text-navy">
                      {s.title}
                    </h3>
                    {s.summary ? (
                      <p className="mt-2 text-textSecondary">{s.summary}</p>
                    ) : null}
                    <div className="mt-4 space-y-4">
                      {s.blocks.map((b) => (
                        <JourneyBlockRenderer key={b.id} block={b as never} />
                      ))}
                    </div>
                  </section>
                ))}
            </div>
            <div className="mt-7 flex justify-between gap-3 border-t pt-5">
              {modules[index - 1] ? (
                <Link
                  className="font-semibold text-royalBlue"
                  href={buildStageHref(navigation, modules[index - 1]!.id)}
                >
                  ← Previous: {modules[index - 1]!.title}
                </Link>
              ) : (
                <span />
              )}
              {modules[index + 1] ? (
                <Link
                  className="font-semibold text-royalBlue"
                  href={buildStageHref(navigation, modules[index + 1]!.id)}
                >
                  Next: {modules[index + 1]!.title} →
                </Link>
              ) : null}
            </div>
          </article>
        ) : (
          <p>No document modules are available.</p>
        )}
        <Artifacts content={content} />
        <Traceability content={content} />
        {content.references?.journeyKnowledge?.length ? (
          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-navy">
              Canonical Journey References
            </h2>
            <div className="mt-4 grid gap-3">
              {content.references.journeyKnowledge.map((r, i) => (
                <Link
                  key={`${r.journeySlug}-${i}`}
                  href={`/banking-journeys/${r.journeySlug}`}
                  className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-royalBlue"
                >
                  <span className="block text-xs font-semibold uppercase">
                    Canonical Journey Reference
                  </span>
                  <span className="mt-1 block font-semibold">
                    {r.displayLabel}
                  </span>
                  <span className="mt-1 block text-sm">
                    {human(r.referenceKind)}
                    {r.referenceId ? ` · ${r.referenceId}` : ""}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </JourneyReaderLayout>
      <BackToTop />
    </>
  );
}
