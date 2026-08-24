"use client";
import { useMemo, useState, useTransition } from "react";
import {
  deriveAuthoringQuality,
  findInboundReferences,
  removeArtifact,
  suggestArtifactId,
  type ArtifactCollection,
} from "@/server/ba-document/ba-document-authoring";
import {
  parseBaDocumentContent,
  type BaDocumentContentV1,
} from "@/server/ba-document/ba-document-domain";
import {
  validateBaDocumentJson,
  type BaDocumentValidationResult,
} from "@/server/ba-document/ba-document-validation";
import { saveBaDocumentAction } from "./actions";
// Regression invariant: validateBaDocumentJson(currentJson()) validates the current editor state.
type Item = {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
};
const groups: Array<[ArtifactCollection, string]> = [
  ["requirements", "Requirements"],
  ["businessRules", "Business rules"],
  ["validations", "Validations"],
  ["processes", "Processes"],
  ["dataElements", "Data elements"],
  ["dataMappings", "Data mappings"],
  ["acceptanceCriteria", "Acceptance criteria"],
  ["uatScenarios", "UAT scenarios"],
  ["decisions", "Decisions"],
];
function blank(c: BaDocumentContentV1, k: ArtifactCollection): Item {
  const id = suggestArtifactId(c, k);
  switch (k) {
    case "requirements":
      return {
        id,
        type: "FUNCTIONAL",
        title: "New requirement",
        description: "Describe the required capability.",
        businessRationale: "Explain the business value.",
        source: { type: "STAKEHOLDER" },
        priority: "MUST",
        status: "PROPOSED",
      };
    case "businessRules":
      return {
        id,
        name: "New business rule",
        description: "Describe the rule.",
        ruleOrigin: "PROJECT_SPECIFIC_RULE",
        decision: "State the decision.",
        outcome: "State the outcome.",
        sourceType: "STAKEHOLDER",
        appliesToRequirementRefs: [],
      };
    case "validations":
      return {
        id,
        name: "New validation",
        category: "OTHER",
        trigger: "State the trigger.",
        condition: "State the condition.",
        validationLogic: "Describe the logic.",
        successOutcome: "Describe success.",
        failureOutcome: "Describe failure.",
        requirementRefs: [],
      };
    case "processes":
      return {
        id,
        name: "New process",
        purpose: "Describe the purpose.",
        actors: ["Business user"],
        preconditions: ["State a precondition."],
        trigger: "State the trigger.",
        steps: [],
        outcomes: ["State an outcome."],
      };
    case "dataElements":
      return {
        id,
        name: "New data element",
        businessDefinition: "Define the element.",
        dataType: "TEXT",
        mandatory: false,
        classification: "INTERNAL",
      };
    case "dataMappings":
      return {
        id,
        sourceSystem: "Source system",
        sourceEntity: "Source entity",
        sourceField: "Source field",
        targetSystem: "Target system",
        targetEntity: "Target entity",
        targetField: "Target field",
      };
    case "acceptanceCriteria":
      return {
        id,
        requirementRef: "",
        title: "New acceptance criterion",
        format: "BUSINESS_READABLE",
        expectedOutcome: "State the business outcome.",
      };
    case "uatScenarios":
      return {
        id,
        title: "New UAT scenario",
        objective: "State the objective.",
        requirementRefs: [],
        acceptanceCriteriaRefs: [],
        steps: [],
        expectedResult: "State the expected result.",
        priority: "MEDIUM",
      };
    case "decisions":
      return {
        id,
        title: "New decision",
        decision: "State the decision.",
        rationale: "Explain the rationale.",
      };
  }
}
function Results({ r }: { r: BaDocumentValidationResult }) {
  return r.status === "VALID" ? (
    <p
      role="status"
      className="rounded-xl border border-green-300 bg-green-50 p-4 text-green-900"
    >
      <b>VALID</b> — canonical validation passed.
    </p>
  ) : (
    <section
      role="alert"
      className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-950"
    >
      <b>Validation failed — {r.issueCount} issues</b>
      <ul className="mt-2 max-h-72 overflow-auto text-sm">
        {r.issues.map((x, i) => (
          <li key={`${x.path}-${i}`} className="mt-2">
            <code>{x.path}</code>
            <span className="block">{x.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
export function BaDocumentEditor({
  slug,
  revisionId,
  initialJson,
}: {
  slug: string;
  revisionId: string;
  initialJson: string;
}) {
  const initial = useMemo(
    () => parseBaDocumentContent(JSON.parse(initialJson)),
    [initialJson],
  );
  const [c, setC] = useState(initial),
    [json, setJson] = useState(JSON.stringify(initial, null, 2)),
    [mode, setMode] = useState<"structured" | "json">("structured"),
    [active, setActive] = useState<ArtifactCollection>("requirements"),
    [result, setResult] = useState<BaDocumentValidationResult>(),
    [saved, setSaved] = useState(false),
    [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const q = useMemo(() => deriveAuthoringQuality(c), [c]);
  const all = Object.values(c.artifacts).flatMap((x) => (x ?? []) as Item[]);
  const replace = (k: ArtifactCollection, items: Item[]) =>
    setC(
      (x) =>
        ({
          ...x,
          artifacts: { ...x.artifacts, [k]: items },
        }) as BaDocumentContentV1,
    );
  const update = (i: number, f: string, v: unknown) =>
    replace(
      active,
      ((c.artifacts[active] ?? []) as Item[]).map((x, n) =>
        n === i ? { ...x, [f]: v } : x,
      ),
    );
  const sync = () => {
    const next = JSON.stringify(c, null, 2);
    setJson(next);
    return next;
  };
  const validate = () => setResult(validateBaDocumentJson(sync()));
  const save = () => {
    const current = sync(),
      local = validateBaDocumentJson(current);
    setResult(local);
    setSaved(false);
    if (local.status !== "VALID") return;
    startTransition(async () => {
      const data = new FormData();
      data.set("slug", slug);
      data.set("revisionId", revisionId);
      data.set("contentJson", current);
      const response = await saveBaDocumentAction(data);
      if (response.ok) setSaved(true);
      else setResult(response.validation);
    });
  };
  return (
    <div className="space-y-5 rounded-2xl border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap gap-2">
        <Tab onClick={() => setMode("structured")} on={mode === "structured"}>
          Structured authoring
        </Tab>
        <Tab
          onClick={() => {
            setJson(JSON.stringify(c, null, 2));
            setMode("json");
          }}
          on={mode === "json"}
        >
          Advanced JSON
        </Tab>
      </div>
      {mode === "structured" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Document code"
              value={c.metadata.documentCode}
              set={(v) =>
                setC((x) => ({
                  ...x,
                  metadata: { ...x.metadata, documentCode: v },
                }))
              }
            />
            <Field
              label="Title"
              value={c.metadata.title}
              set={(v) =>
                setC((x) => ({ ...x, metadata: { ...x.metadata, title: v } }))
              }
            />
            <label className="font-semibold md:col-span-2">
              Summary
              <textarea
                value={c.metadata.summary}
                onChange={(e) =>
                  setC((x) => ({
                    ...x,
                    metadata: { ...x.metadata, summary: e.target.value },
                  }))
                }
                rows={3}
                className="mt-2 w-full rounded-xl border p-3 font-normal"
              />
            </label>
          </div>
          <section className="rounded-xl border bg-slate-50 p-4">
            <h3 className="font-semibold">Quality and readiness</h3>
            <p className="mt-1 text-sm">
              {q.totalArtifacts} artifacts · {q.counts.linked} linked ·{" "}
              {q.counts.partial} partial · {q.counts.unlinked} unlinked ·{" "}
              {q.counts.invalid} invalid
            </p>
            <p
              className={`mt-2 font-semibold ${q.readyForReview ? "text-green-700" : "text-amber-700"}`}
            >
              {q.readyForReview
                ? "Ready for review"
                : "Review warnings before submission"}
            </p>
            {[...q.blockers, ...q.warnings].map((x) => (
              <p key={x} className="text-sm">
                • {x}
              </p>
            ))}
          </section>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {groups.map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setActive(k)}
                className={`min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold ${active === k ? "bg-royalBlue text-white" : "border"}`}
              >
                {l} ({c.artifacts[k]?.length ?? 0})
              </button>
            ))}
          </div>
          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {groups.find((x) => x[0] === active)?.[1]}
              </h3>
              <button
                type="button"
                onClick={() => {
                  replace(active, [
                    ...((c.artifacts[active] ?? []) as Item[]),
                    blank(c, active),
                  ]);
                  setMessage("Artifact added with a suggested stable ID.");
                }}
                className="min-h-11 rounded-xl border border-royalBlue px-4 font-semibold text-royalBlue"
              >
                Add artifact
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {((c.artifacts[active] ?? []) as Item[]).map((x, i) => (
                <article key={x.id} className="rounded-xl border p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field
                      label="Stable ID"
                      value={x.id}
                      set={(v) => update(i, "id", v)}
                    />
                    {x.title !== undefined ? (
                      <Field
                        label="Title"
                        value={x.title}
                        set={(v) => update(i, "title", v)}
                      />
                    ) : null}
                    {x.name !== undefined ? (
                      <Field
                        label="Name"
                        value={x.name}
                        set={(v) => update(i, "name", v)}
                      />
                    ) : null}
                    {x.description !== undefined ? (
                      <Field
                        label="Description"
                        value={x.description}
                        set={(v) => update(i, "description", v)}
                      />
                    ) : null}
                  </div>
                  <Refs item={x} all={all} set={(f, v) => update(i, f, v)} />
                  <button
                    type="button"
                    onClick={() => {
                      const hits = findInboundReferences(c, x.id);
                      if (hits.length)
                        setMessage(
                          `Cannot delete ${x.id}: referenced by ${hits.map((h) => h.artifactId).join(", ")}.`,
                        );
                      else {
                        setC(removeArtifact(c, active, x.id));
                        setMessage(`${x.id} removed.`);
                      }
                    }}
                    className="mt-3 min-h-10 font-semibold text-red-700"
                  >
                    Delete artifact
                  </button>
                </article>
              ))}
              {!c.artifacts[active]?.length ? (
                <p className="rounded-xl border border-dashed p-5 text-sm">
                  No artifacts yet.
                </p>
              ) : null}
            </div>
          </section>
        </>
      ) : (
        <section>
          <p className="mb-3 rounded-xl bg-blue-50 p-3 text-sm">
            Expert escape hatch. Valid JSON updates the same canonical document
            state.
          </p>
          <textarea name="contentJson" value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={30}
            className="w-full rounded-xl border p-3 font-mono text-xs"
          />
          <button
            type="button"
            onClick={() => {
              const r = validateBaDocumentJson(json);
              setResult(r);
              if (r.status === "VALID") {
                setC(parseBaDocumentContent(JSON.parse(json)));
                setMessage("Advanced JSON applied to canonical state.");
              }
            }}
            className="mt-3 min-h-11 rounded-xl border border-royalBlue px-4 font-semibold text-royalBlue"
          >
            Validate JSON and apply
          </button>
        </section>
      )}
      {message ? (
        <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm">
          {message}
        </p>
      ) : null}
      {result ? <Results r={result} /> : null}
      {saved ? (
        <p className="rounded-xl bg-green-50 p-3 font-semibold text-green-900">
          Saved and verified against database read-back.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={validate}
          className="min-h-11 rounded-xl border border-royalBlue px-5 font-semibold text-royalBlue"
        >
          Validate document
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="min-h-11 rounded-xl bg-royalBlue px-5 font-semibold text-white"
        >
          {pending ? "Saving…" : "Save and verify"}
        </button>
      </div>
    </div>
  );
}
function Field({
  label,
  value,
  set,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
}) {
  return (
    <label className="font-semibold">
      {label}
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        className="mt-2 min-h-11 w-full rounded-xl border px-3 font-normal"
      />
    </label>
  );
}
function Tab({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-xl px-4 font-semibold ${on ? "bg-navy text-white" : "border"}`}
    >
      {children}
    </button>
  );
}
function Refs({
  item,
  all,
  set,
}: {
  item: Item;
  all: Item[];
  set: (f: string, v: string[]) => void;
}) {
  const fields = [
    "requirementRefs",
    "businessRuleRefs",
    "ruleRefs",
    "validationRefs",
    "processRefs",
    "dataRefs",
    "acceptanceCriteriaRefs",
    "uatRefs",
    "dependencies",
    "appliesToRequirementRefs",
    "relatedRequirementRefs",
  ].filter((f) => f in item);
  return (
    <>
      {fields.map((f) => (
        <label key={f} className="mt-3 block text-sm font-semibold">
          {f}
          <select
            multiple
            value={(item[f] as string[] | undefined) ?? []}
            onChange={(e) =>
              set(
                f,
                Array.from(e.target.selectedOptions, (o) => o.value),
              )
            }
            className="mt-1 min-h-24 w-full rounded-xl border p-2 font-normal"
          >
            {all
              .filter((a) => a.id !== item.id)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} — {String(a.title ?? a.name ?? "Untitled")}
                </option>
              ))}
          </select>
          <span className="block text-xs font-normal text-slate-500">
            Stores stable IDs, not display labels.
          </span>
        </label>
      ))}
    </>
  );
}
