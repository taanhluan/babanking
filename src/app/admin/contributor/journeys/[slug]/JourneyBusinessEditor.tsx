"use client";

import { useMemo, useRef, useCallback, useState } from "react";
import { upload } from "@vercel/blob/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { journeyMediaProxyUrl, journeyMediaUploadPath, MAX_JOURNEY_CONTENT_BYTES } from "@/lib/journey-media";
import { parseJsonObjectSafely } from "@/lib/safe-json";
import { saveJourneyDraftAction } from "../actions";
import { ContentNavigator } from "./ContentNavigator";
import { RevisionToolbar } from "./RevisionToolbar";
import { SelectedContentWorkspace } from "./SelectedContentWorkspace";
import {
  buildEditorBreadcrumb,
  getSiblingNode,
  type EditorNode,
} from "./journey-editor-navigation";
import {
  classifyWorkspaceBlock,
  deriveModuleSummary,
  isLifecycleSection,
  moduleWorkspaceTabs,
  workspaceBlockTypeSummary,
} from "./journey-module-workspace";
import {
  addJourneyBlock,
  addJourneySubsection,
  duplicateJourneyBlock,
  moveJourneyBlock,
  moveJourneySection,
  removeJourneyBlock,
  removeJourneySection,
  removeJourneySubsection,
  updateJourneyBlockType,
  updateJourneyModuleMedia,
  updateJourneySectionMedia,
  updateJourneySubsectionMedia,
  type JourneyMediaAsset,
  type JourneyEditorNodePath,
  type JourneyMutationResult,
} from "./journey-editor-mutations";
import {
  parseAdvancedJourneyText,
  resolveJourneyEditorSave,
} from "./journey-editor-save";

type JsonObject = Record<string, unknown>;
type Block = {
  id?: string;
  blockType: string;
  schemaVersion: number;
  payload: JsonObject;
};
type Subsection = {
  id?: string;
  key?: string;
  title: string;
  order?: number;
  blocks: Block[];
  media?: JourneyMediaAsset;
};
type Section = {
  id?: string;
  key?: string;
  title: string;
  order?: number;
  blocks: Block[];
  subsections?: Subsection[];
  media?: JourneyMediaAsset;
};
type Module = {
  id?: string;
  key?: string;
  title: string;
  summary?: string;
  order?: number;
  sections: Section[];
  media?: JourneyMediaAsset;
};
type Node = EditorNode & { depth: number };
const blockTypes = [
  "RICH_TEXT",
  "TABLE",
  "DIAGRAM",
  "IMAGE",
  "API_REFERENCE",
  "CODE",
  "DOWNLOAD",
  "CHECKLIST",
  "REFERENCE",
  "CALLOUT",
];
const editorModeLabels = [
  "Business Editor",
  "Advanced JSON",
  "Modules, sections and blocks",
];
const modulesFrom = (content: JsonObject): Module[] =>
  Array.isArray(content.modules) ? (content.modules as Module[]) : [];
const nodeId = (
  moduleIndex: number,
  sectionIndex?: number,
  blockIndex?: number,
) =>
  sectionIndex === undefined
    ? `m-${moduleIndex}`
    : blockIndex === undefined
      ? `m-${moduleIndex}-s-${sectionIndex}`
      : `m-${moduleIndex}-s-${sectionIndex}-b-${blockIndex}`;
function makeNodes(modules: Module[]): Node[] {
  return modules.flatMap((module, moduleIndex) => [
    {
      id: nodeId(moduleIndex),
      type: "module" as const,
      title: module.title,
      moduleIndex,
      depth: 0,
    },
    ...module.sections.flatMap((section, sectionIndex) => [
      {
        id: nodeId(moduleIndex, sectionIndex),
        type: "section" as const,
        title: section.title,
        moduleIndex,
        sectionIndex,
        depth: 1,
      },
      ...(section.subsections ?? []).map((subsection, subsectionIndex) => ({
        id: `m-${moduleIndex}-s-${sectionIndex}-ss-${subsectionIndex}`,
        type: "subsection" as const,
        title: subsection.title,
        moduleIndex,
        sectionIndex,
        subsectionIndex,
        depth: 2,
      })),
      ...section.blocks.map((block, blockIndex) => ({
        id: nodeId(moduleIndex, sectionIndex, blockIndex),
        type: "block" as const,
        title:
          typeof block.payload?.title === "string"
            ? block.payload.title
            : block.blockType,
        moduleIndex,
        sectionIndex,
        blockIndex,
        depth: 2,
      })),
    ]),
  ]);
}
type StructuredItem = Record<string, unknown>;
function itemArrayKind(
  items: unknown,
): "EMPTY" | "STRING_LIST" | "OBJECT_LIST" {
  if (!Array.isArray(items) || items.length === 0) return "EMPTY";
  return items.every((item) => typeof item === "string")
    ? "STRING_LIST"
    : "OBJECT_LIST";
}

function StructuredItemsEditor({
  items,
  onChange,
}: {
  items: StructuredItem[];
  onChange: (items: StructuredItem[]) => void;
}) {
  const update = (index: number, field: string, value: string) =>
    onChange(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  const add = () => {
    const ids = new Set(
      items.map((item) => (typeof item.id === "string" ? item.id : "")),
    );
    let suffix = 1;
    let id = "new-state";
    while (ids.has(id)) id = `new-state-${++suffix}`;
    onChange([...items, { id, name: "New State", description: "" }]);
  };
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`${String(item.id ?? index)}-${index}`}
          className="rounded-lg border border-slate-200 p-3"
        >
          <label className="block text-sm font-semibold">
            ID
            <input
              value={typeof item.id === "string" ? item.id : ""}
              onChange={(event) => update(index, "id", event.target.value)}
              className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 font-normal"
            />
          </label>
          <label className="mt-2 block text-sm font-semibold">
            Name
            <input
              value={typeof item.name === "string" ? item.name : ""}
              onChange={(event) => update(index, "name", event.target.value)}
              className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 font-normal"
            />
          </label>
          <label className="mt-2 block text-sm font-semibold">
            Description
            <textarea
              value={
                typeof item.description === "string" ? item.description : ""
              }
              onChange={(event) =>
                update(index, "description", event.target.value)
              }
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              onChange(items.filter((_, itemIndex) => itemIndex !== index))
            }
            className="mt-2 text-sm text-red-700"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="min-h-10 rounded-lg border border-royalBlue px-3 text-sm font-semibold text-royalBlue"
      >
        Add State
      </button>
    </div>
  );
}

const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp";
const ACCEPTED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ACCEPTED_DIAGRAM_MIME_TYPES = new Set(["image/png"]);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
type MediaUploadContext = { slug: string; revisionId: string; enabled: boolean };

async function sha256File(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function journeyMediaAlreadyExists(
  uploadContext: MediaUploadContext,
  kind: "image" | "diagram",
  contentHash: string,
) {
  const params = new URLSearchParams({
    slug: uploadContext.slug,
    revisionId: uploadContext.revisionId,
    kind,
    contentHash,
  });
  const response = await fetch(`/api/journey-media/upload?${params.toString()}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { code?: unknown } | null;
    if (body?.code === "media_upload_not_permitted") {
      throw new Error("Your session or editable draft has changed. Refresh the page and try again.");
    }
    if (body?.code === "media_storage_unavailable") {
      throw new Error("Media storage is temporarily unavailable. Try again shortly.");
    }
    throw new Error("Media lookup failed. Refresh the page and try again.");
  }
  return (await response.json() as { exists?: boolean }).exists === true;
}

function emptyJourneyDraft(): JsonObject {
  return { title: "", summary: "", schemaVersion: 2, modules: [] };
}

function initialJourneyEditorState(initialContentJson: string) {
  const parsed = parseJsonObjectSafely(initialContentJson);
  return parsed.ok
    ? { content: parsed.value, advancedText: JSON.stringify(parsed.value, null, 2), error: "" }
    : { content: emptyJourneyDraft(), advancedText: initialContentJson, error: parsed.error };
}

function ImageBlockEditor({
  payload,
  onChange,
  uploadContext,
  label = "Image",
}: {
  payload: JsonObject;
  onChange: (payload: JsonObject) => void;
  uploadContext: MediaUploadContext;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadInFlightRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFile = useCallback(
    async (file: File) => {
      if (uploadInFlightRef.current) return;
      setUploadError("");
      if (!uploadContext.enabled) {
        setUploadError("Journey media storage is not configured. Use an HTTPS image URL instead.");
        return;
      }
      if (!ACCEPTED_IMAGE_MIME_TYPES.has(file.type)) {
        setUploadError("Only PNG, JPG, and WEBP images are accepted.");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setUploadError(`Image must be under 15 MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB).`);
        return;
      }
      uploadInFlightRef.current = true;
      setUploading(true);
      try {
        const contentHash = await sha256File(file);
        const pathname = journeyMediaUploadPath(uploadContext.slug, uploadContext.revisionId, "image", contentHash);
        const rest = { ...payload };
        delete rest.url;
        if (await journeyMediaAlreadyExists(uploadContext, "image", contentHash)) {
          onChange({ ...rest, mediaPath: pathname, fileName: file.name, mimeType: file.type, bytes: file.size });
          return;
        }
        const blob = await upload(
          pathname,
          file,
          {
            access: "private",
            contentType: file.type,
            handleUploadUrl: "/api/journey-media/upload",
            clientPayload: JSON.stringify({ slug: uploadContext.slug, revisionId: uploadContext.revisionId, kind: "image", contentHash }),
            multipart: file.size > 4_500_000,
          },
        );
        onChange({ ...rest, mediaPath: blob.pathname, fileName: file.name, mimeType: file.type, bytes: file.size });
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Upload failed. Check your access and try again.");
      } finally {
        setUploading(false);
        uploadInFlightRef.current = false;
      }
    },
    [payload, onChange, uploadContext],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const currentUrl = typeof payload.url === "string" ? payload.url : "";
  const mediaPath = typeof payload.mediaPath === "string" ? payload.mediaPath : "";
  const isDataUrl = currentUrl.startsWith("data:");
  const hasMedia = Boolean(mediaPath || currentUrl);
  const previewUrl = mediaPath
    ? journeyMediaProxyUrl(uploadContext.slug, mediaPath, uploadContext.revisionId)
    : currentUrl;
  const fileName = typeof payload.fileName === "string" ? payload.fileName : "";

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold">
        {label} title
        <input
          value={typeof payload.title === "string" ? payload.title : ""}
          onChange={(e) => onChange({ ...payload, title: e.target.value })}
          placeholder="Image title"
          className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 font-normal"
        />
      </label>
      <label className="block text-sm font-semibold">
        Alt text
        <input
          value={typeof payload.alt === "string" ? payload.alt : ""}
          onChange={(e) => onChange({ ...payload, alt: e.target.value })}
          placeholder="Describe the image for accessibility"
          className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 font-normal"
        />
      </label>
      <label className="block text-sm font-semibold">
        Caption
        <input
          value={typeof payload.caption === "string" ? payload.caption : ""}
          onChange={(e) => onChange({ ...payload, caption: e.target.value })}
          placeholder="Optional caption displayed below image"
          className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 font-normal"
        />
      </label>

      {/* Upload area */}
      <div>
        <p className="mb-2 text-sm font-semibold">{label} file</p>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => {
            if (!uploadInFlightRef.current) inputRef.current?.click();
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-royalBlue hover:bg-blue-50"
        >
          {uploading ? (
            <p className="text-sm text-slate-500">Reading file…</p>
          ) : hasMedia ? (
            <>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={typeof payload.alt === "string" ? payload.alt : "Preview"}
                  className="max-h-48 max-w-full rounded-lg object-contain"
                />
              ) : null}
              <p className="text-xs text-slate-500">
                {fileName || `${label} loaded`} · Click or drag to replace
              </p>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <p className="text-sm text-slate-500">Click or drag an image here</p>
              <p className="text-xs text-slate-400">PNG, JPG, WEBP · max 15 MB</p>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        {uploadError ? (
          <p className="mt-2 text-xs text-red-700" role="alert">{uploadError}</p>
        ) : null}
        {hasMedia ? (
          <button
            type="button"
            onClick={() => {
              const next = { ...payload };
              delete next.url;
              delete next.mediaPath;
              delete next.fileName;
              delete next.mimeType;
              delete next.bytes;
              onChange(next);
            }}
            className="mt-2 text-xs text-red-700"
          >
            Remove image
          </button>
        ) : null}
      </div>

      {/* External URL fallback */}
      <details>
        <summary className="cursor-pointer text-sm font-semibold text-royalBlue">
          Or enter an external URL
        </summary>
        <label className="mt-2 block text-sm">
          <input
            type="url"
            value={typeof payload.url === "string" && !isDataUrl ? payload.url : ""}
            onChange={(e) => {
              const next: JsonObject = { ...payload, url: e.target.value, fileName: "" };
              delete next.mediaPath;
              delete next.mimeType;
              delete next.bytes;
              onChange(next);
            }}
            placeholder="https://..."
            className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 font-normal"
          />
        </label>
      </details>
    </div>
  );
}

function LevelImageEditor({
  media,
  level,
  onChange,
  uploadContext,
}: {
  media?: JourneyMediaAsset;
  level: "Module" | "Section" | "Subsection";
  onChange: (media?: JourneyMediaAsset) => void;
  uploadContext: MediaUploadContext;
}) {
  const payload: JsonObject = media ?? { kind: "IMAGE", title: `${level} cover`, alt: "" };
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-navy">{level} cover image</h4>
          <p className="mt-1 text-xs text-slate-500">Optional visual context shown before this {level.toLowerCase()}.</p>
        </div>
        {media ? (
          <button type="button" onClick={() => onChange(undefined)} className="text-xs font-semibold text-red-700">
            Remove cover
          </button>
        ) : null}
      </div>
      <ImageBlockEditor
        label={`${level} cover image`}
        payload={payload}
        uploadContext={uploadContext}
        onChange={(next) => onChange({
          kind: "IMAGE",
          title: typeof next.title === "string" ? next.title : undefined,
          mediaPath: typeof next.mediaPath === "string" ? next.mediaPath : undefined,
          url: typeof next.url === "string" ? next.url : undefined,
          alt: typeof next.alt === "string" ? next.alt : "",
          caption: typeof next.caption === "string" ? next.caption : undefined,
          fileName: typeof next.fileName === "string" ? next.fileName : undefined,
          mimeType: typeof next.mimeType === "string" ? next.mimeType : undefined,
          bytes: typeof next.bytes === "number" ? next.bytes : undefined,
        })}
      />
    </section>
  );
}

const DIAGRAM_TYPES = [
  { value: "sequence", label: "Sequence Diagram" },
  { value: "flowchart", label: "Flowchart" },
  { value: "class", label: "Class Diagram" },
  { value: "er", label: "Entity-Relationship" },
  { value: "gantt", label: "Gantt Chart" },
  { value: "other", label: "Other / Custom" },
];

function DiagramBlockEditor({
  payload,
  onChange,
  uploadContext,
}: {
  payload: JsonObject;
  onChange: (payload: JsonObject) => void;
  uploadContext: MediaUploadContext;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadInFlightRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFile = useCallback(
    async (file: File) => {
      if (uploadInFlightRef.current) return;
      setUploadError("");
      if (!uploadContext.enabled) {
        setUploadError("Journey media storage is not configured. Use a supported external image URL instead.");
        return;
      }
      if (!ACCEPTED_DIAGRAM_MIME_TYPES.has(file.type)) {
        setUploadError("Only PNG diagram exports are accepted.");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setUploadError(`File must be under 15 MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB).`);
        return;
      }
      uploadInFlightRef.current = true;
      setUploading(true);
      try {
        const contentHash = await sha256File(file);
        const pathname = journeyMediaUploadPath(uploadContext.slug, uploadContext.revisionId, "diagram", contentHash);
        const rest = { ...payload };
        delete rest.url;
        if (await journeyMediaAlreadyExists(uploadContext, "diagram", contentHash)) {
          onChange({ ...rest, mediaPath: pathname, fileName: file.name, mimeType: file.type, bytes: file.size });
          return;
        }
        const blob = await upload(
          pathname,
          file,
          {
            access: "private",
            contentType: file.type,
            handleUploadUrl: "/api/journey-media/upload",
            clientPayload: JSON.stringify({ slug: uploadContext.slug, revisionId: uploadContext.revisionId, kind: "diagram", contentHash }),
            multipart: file.size > 4_500_000,
          },
        );
        onChange({ ...rest, mediaPath: blob.pathname, fileName: file.name, mimeType: file.type, bytes: file.size });
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Upload failed. Check your access and try again.");
      } finally {
        setUploading(false);
        uploadInFlightRef.current = false;
      }
    },
    [payload, onChange, uploadContext],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const currentUrl = typeof payload.url === "string" ? payload.url : "";
  const mediaPath = typeof payload.mediaPath === "string" ? payload.mediaPath : "";
  const hasMedia = Boolean(mediaPath || currentUrl);
  const previewUrl = mediaPath
    ? journeyMediaProxyUrl(uploadContext.slug, mediaPath, uploadContext.revisionId)
    : currentUrl;
  const fileName = typeof payload.fileName === "string" ? payload.fileName : "";

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold">
        Title
        <input
          value={typeof payload.title === "string" ? payload.title : ""}
          onChange={(e) => onChange({ ...payload, title: e.target.value })}
          placeholder="Diagram title"
          className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 font-normal"
        />
      </label>

      <label className="block text-sm font-semibold">
        Diagram type
        <select
          value={typeof payload.diagramType === "string" ? payload.diagramType : "other"}
          onChange={(e) => onChange({ ...payload, diagramType: e.target.value })}
          className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 font-normal"
        >
          {DIAGRAM_TYPES.map((dt) => (
            <option key={dt.value} value={dt.value}>{dt.label}</option>
          ))}
        </select>
      </label>

      {/* Upload area */}
      <div>
        <p className="mb-2 text-sm font-semibold">Diagram image file</p>
        <p className="mb-3 text-xs text-slate-500">Upload a PNG export of your diagram (e.g. exported from draw.io, Lucidchart, PlantUML, or similar tools).</p>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => {
            if (!uploadInFlightRef.current) inputRef.current?.click();
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-royalBlue hover:bg-blue-50"
        >
          {uploading ? (
            <p className="text-sm text-slate-500">Reading file…</p>
          ) : hasMedia ? (
            <>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={typeof payload.title === "string" ? payload.title : "Diagram preview"}
                  className="max-h-64 max-w-full rounded-lg object-contain"
                />
              ) : null}
              <p className="text-xs text-slate-500">
                {fileName || "Diagram loaded"} · Click or drag to replace
              </p>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect x="2" y="3" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/><rect x="9" y="15" width="6" height="6" rx="1"/><path d="M5 9v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><line x1="12" y1="12" x2="12" y2="15"/></svg>
              <p className="text-sm text-slate-500">Click or drag a diagram image here</p>
              <p className="text-xs text-slate-400">PNG · max 15 MB</p>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        {uploadError ? (
          <p className="mt-2 text-xs text-red-700" role="alert">{uploadError}</p>
        ) : null}
        {hasMedia ? (
          <button
            type="button"
            onClick={() => {
              const next = { ...payload };
              delete next.url;
              delete next.mediaPath;
              delete next.fileName;
              delete next.mimeType;
              delete next.bytes;
              onChange(next);
            }}
            className="mt-2 text-xs text-red-700"
          >
            Remove diagram image
          </button>
        ) : null}
      </div>

      <label className="block text-sm font-semibold">
        Description / notes
        <textarea
          value={typeof payload.description === "string" ? payload.description : ""}
          onChange={(e) => onChange({ ...payload, description: e.target.value })}
          rows={3}
          placeholder="Optional description of what this diagram shows"
          className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal"
        />
      </label>
    </div>
  );
}

function PayloadEditor({
  block,
  onChange,
  uploadContext,
}: {
  block: Block;
  onChange: (payload: JsonObject) => void;
  uploadContext: MediaUploadContext;
}) {
  const [value, setValue] = useState(JSON.stringify(block.payload, null, 2));
  const [error, setError] = useState("");
  const applyJson = () => {
    try {
      const parsed: unknown = JSON.parse(value);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error();
      setError("");
      onChange(parsed as JsonObject);
    } catch {
      setError("Payload must be a valid JSON object.");
    }
  };
  const payload = block.payload;
  const text =
    typeof payload.text === "string"
      ? payload.text
      : typeof payload.content === "string"
        ? payload.content
        : "";
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const itemsKind = itemArrayKind(rawItems);
  const items = itemsKind === "STRING_LIST" ? rawItems.join("\n") : "";
  const advanced = (
    <>
      <textarea
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setError("");
        }}
        rows={8}
        className="mt-2 w-full overflow-auto rounded-lg border border-slate-300 p-3 font-mono text-xs font-normal"
      />
      <button type="button" onClick={applyJson} className="mt-2 min-h-9 rounded-lg border border-royalBlue px-3 text-xs font-semibold text-royalBlue">
        Apply payload JSON
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </>
  );
  if (block.blockType === "IMAGE")
    return <ImageBlockEditor payload={payload} onChange={onChange} uploadContext={uploadContext} />;
  if (block.blockType === "DIAGRAM")
    return <DiagramBlockEditor payload={payload} onChange={onChange} uploadContext={uploadContext} />;
  if (["RICH_TEXT", "CALLOUT", "CODE"].includes(block.blockType))
    return (
      <div className="space-y-3">
        <label className="block text-sm font-semibold">
          Title
          <input
            value={typeof payload.title === "string" ? payload.title : ""}
            onChange={(event) =>
              onChange({ ...payload, title: event.target.value })
            }
            className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 font-normal"
          />
        </label>
        <label className="block text-sm font-semibold">
          Content
          <textarea
            value={text}
            onChange={(event) =>
              onChange({ ...payload, text: event.target.value })
            }
            rows={8}
            className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal"
          />
        </label>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-royalBlue">
            Advanced JSON
          </summary>
          {advanced}
        </details>
      </div>
    );
  if (["CHECKLIST", "REFERENCE"].includes(block.blockType))
    return (
      <div className="space-y-3">
        <label className="block text-sm font-semibold">
          Title
          <input
            value={typeof payload.title === "string" ? payload.title : ""}
            onChange={(event) =>
              onChange({ ...payload, title: event.target.value })
            }
            className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 font-normal"
          />
        </label>
        {itemsKind === "OBJECT_LIST" ? (
          <StructuredItemsEditor
            items={rawItems as StructuredItem[]}
            onChange={(next) => onChange({ ...payload, items: next })}
          />
        ) : (
          <label className="block text-sm font-semibold">
            Items
            <textarea
              value={items}
              onChange={(event) =>
                onChange({
                  ...payload,
                  items: event.target.value.split("\n").filter(Boolean),
                })
              }
              rows={8}
              className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal"
            />
          </label>
        )}
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-royalBlue">
            Advanced JSON
          </summary>
          {advanced}
        </details>
      </div>
    );
  return (
    <details open>
      <summary className="cursor-pointer text-sm font-semibold text-royalBlue">
        Advanced JSON
      </summary>
      {advanced}
    </details>
  );
}

function AdvancedJsonEditor({
  text,
  error,
  dirty,
  onTextChange,
  onApply,
}: {
  text: string;
  error: string;
  dirty: boolean;
  onTextChange: (next: string) => void;
  onApply: () => void;
}) {
  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        rows={24}
        className="w-full rounded-xl border border-slate-300 p-4 font-mono text-xs"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onApply}
          className="min-h-10 rounded-lg border border-royalBlue px-4 text-sm font-semibold text-royalBlue"
        >
          Apply to structured view
        </button>
        {dirty ? (
          <span className="text-sm font-medium text-amber-700">
            Unsaved Advanced JSON changes
          </span>
        ) : null}
      </div>
      <p className="text-xs text-slate-500">
        Save Draft validates and saves the current JSON above. Applying it first
        is optional.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ModuleWorkspace({
  module,
  moduleIndex,
  totalModules,
  sections,
  content,
  onUpdate,
  onSelect,
  onPrevious,
  onNext,
}: {
  module: Module;
  moduleIndex: number;
  totalModules: number;
  sections: Section[];
  content: JsonObject;
  onUpdate: (next: JsonObject) => void;
  onSelect: (id: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const [tab, setTab] = useState("overview");
  const summary = deriveModuleSummary(sections);
  const tabs = [
    { id: "overview", label: "Overview", visible: true },
    ...moduleWorkspaceTabs(sections).map((item) => ({
      id: item.id,
      label: item.label,
      visible: true,
    })),
    { id: "all", label: "All Sections", visible: true },
  ].filter((item) => item.visible);
  const sectionRows = sections.map((section, index) => ({
    section,
    index,
    id: `m-${moduleIndex}-s-${index}`,
  }));
  const matching = (category: string) =>
    sectionRows.flatMap(({ section, index }) =>
      section.blocks
        .map((block, blockIndex) =>
          classifyWorkspaceBlock(block) === category
            ? {
                title:
                  typeof block.payload.title === "string"
                    ? block.payload.title
                    : block.blockType,
                path: `${module.title} › ${section.title}`,
                id: `m-${moduleIndex}-s-${index}-b-${blockIndex}`,
                blockType: block.blockType,
              }
            : null,
        )
        .filter(Boolean),
    );
  const openSection = (id: string) => onSelect(id);
  const renderSections = (rows: typeof sectionRows) =>
    rows.length ? (
      <div className="space-y-2">
        {rows.map(({ section, index, id }) => (
          <button
            key={id}
            type="button"
            onClick={() => openSection(id)}
            className="block w-full rounded-lg border border-slate-200 p-3 text-left hover:border-royalBlue"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">
                Section {index + 1} · {section.title}
              </span>
              <span className="text-xs text-slate-500">
                {section.blocks.length} blocks
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {workspaceBlockTypeSummary(section.blocks)}
            </p>
          </button>
        ))}
      </div>
    ) : (
      <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
        This module has no sections yet.
      </p>
    );
  const renderCategory = (category: string) => {
    const results = matching(category);
    return results.length ? (
      <div className="space-y-2">
        {results.map((result) => (
          <button
            key={result!.id}
            type="button"
            onClick={() => onSelect(result!.id)}
            className="block w-full rounded-lg border border-slate-200 p-3 text-left hover:border-royalBlue"
          >
            <span className="font-semibold">{result!.title}</span>
            <span className="mt-1 block text-xs text-slate-500">
              {result!.path} · {result!.blockType}
            </span>
          </button>
        ))}
      </div>
    ) : null;
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-royalBlue">
            Selected module
          </p>
          <h3 className="mt-1 text-2xl font-semibold text-navy">
            {module.title}
          </h3>
          <p className="text-sm text-slate-500">
            {module.key ?? "No module key"} · Module {moduleIndex + 1} of{" "}
            {totalModules}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={moduleIndex === 0}
            onClick={onPrevious}
            className="rounded-lg border px-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={moduleIndex === totalModules - 1}
            onClick={onNext}
            className="rounded-lg border px-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
      <label className="block text-sm font-semibold">
        Module title
        <input
          value={module.title}
          onChange={(event) =>
            onUpdate({
              ...content,
              modules: Array.isArray(content.modules)
                ? (content.modules as Module[]).map((item, index) =>
                    index === moduleIndex
                      ? { ...item, title: event.target.value }
                      : item,
                  )
                : [],
            })
          }
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal"
        />
      </label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.entries({
          Sections: summary.sections,
          Blocks: summary.blocks,
          "Lifecycle stages": summary.lifecycle,
          "Business Rules": summary.rules,
          APIs: summary.apis,
          Exceptions: summary.exceptions,
          Diagrams: summary.diagrams,
          "Learning Assets": summary.learning,
        })
          .filter(
            ([, count]) =>
              count > 0 || ["Sections", "Blocks"].includes(String(count)),
          )
          .map(([label, count]) => (
            <div key={label} className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xl font-semibold">{count}</p>
            </div>
          ))}
      </div>
      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 px-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`min-h-10 shrink-0 border-b-2 px-3 text-sm font-semibold ${tab === item.id ? "border-royalBlue text-royalBlue" : "border-transparent text-slate-500"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "overview" || tab === "all"
        ? renderSections(sectionRows)
        : tab === "lifecycle"
          ? renderSections(
              sectionRows.filter(({ section }) => isLifecycleSection(section)),
            )
          : renderCategory(
              tab === "rules"
                ? "rules"
                : tab === "apis"
                  ? "apis"
                  : tab === "exceptions"
                    ? "exceptions"
                    : tab === "diagrams"
                      ? "diagrams"
                      : "learning",
            )}
    </div>
  );
}

function safeBlockTitle(block: Block) {
  const payload = block.payload;
  for (const key of ["title", "name", "question", "scenario"])
    if (typeof payload[key] === "string" && payload[key])
      return payload[key] as string;
  return block.blockType.replaceAll("_", " ");
}

function safeBlockSummary(block: Block) {
  const payload = block.payload;
  for (const key of [
    "content",
    "summary",
    "purpose",
    "description",
    "endpoint",
    "service",
  ])
    if (typeof payload[key] === "string" && payload[key])
      return (payload[key] as string).slice(0, 120);
  return "";
}

function SectionWorkspace({
  section,
  module,
  moduleIndex,
  sectionIndex,
  content,
  onUpdate,
  onSelect,
  onPrevious,
  onNext,
  onMutate,
}: {
  section: Section;
  module: Module;
  moduleIndex: number;
  sectionIndex: number;
  content: JsonObject;
  onUpdate: (next: JsonObject) => void;
  onSelect: (id: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onMutate: (result: JourneyMutationResult) => void;
}) {
  const counts = new Map<string, number>();
  section.blocks.forEach((block) =>
    counts.set(block.blockType, (counts.get(block.blockType) ?? 0) + 1),
  );
  const summary = [...counts.entries()]
    .map(([type, count]) => `${type.replaceAll("_", " ")} (${count})`)
    .join(" · ");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-royalBlue">
            Selected section
          </p>
          <h3 className="mt-1 text-2xl font-semibold text-navy">
            {section.title}
          </h3>
          <p className="text-sm text-slate-500">
            {module.title} · Section {sectionIndex + 1} of{" "}
            {module.sections.length} · {section.blocks.length} blocks
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={sectionIndex === 0}
            onClick={onPrevious}
            className="rounded-lg border px-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={sectionIndex === module.sections.length - 1}
            onClick={onNext}
            className="rounded-lg border px-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
          <button
            type="button"
            disabled={(section.subsections?.length ?? 0) >= 20}
            onClick={() =>
              onMutate(
                addJourneySubsection(
                  content as never,
                  moduleIndex,
                  sectionIndex,
                ),
              )
            }
            className="rounded-lg border border-royalBlue px-3 text-sm font-semibold text-royalBlue disabled:opacity-40"
          >
            Add Subsection
          </button>
          <button
            type="button"
            onClick={() =>
              onMutate(
                addJourneyBlock(content as never, moduleIndex, sectionIndex),
              )
            }
            className="rounded-lg bg-royalBlue px-3 text-sm font-semibold text-white"
          >
            Add Block
          </button>
          <button
            type="button"
            disabled={sectionIndex === 0}
            onClick={() =>
              onMutate(
                moveJourneySection(
                  content as never,
                  moduleIndex,
                  sectionIndex,
                  "up",
                ),
              )
            }
            className="rounded-lg border px-2 text-sm disabled:opacity-40"
          >
            Move Up
          </button>
          <button
            type="button"
            disabled={sectionIndex === module.sections.length - 1}
            onClick={() =>
              onMutate(
                moveJourneySection(
                  content as never,
                  moduleIndex,
                  sectionIndex,
                  "down",
                ),
              )
            }
            className="rounded-lg border px-2 text-sm disabled:opacity-40"
          >
            Move Down
          </button>
          <button
            type="button"
            onClick={() =>
              onMutate(
                removeJourneySection(
                  content as never,
                  moduleIndex,
                  sectionIndex,
                ),
              )
            }
            className="rounded-lg border border-red-200 px-2 text-sm text-red-700"
          >
            Remove Section
          </button>
        </div>
      </div>
      <label className="block text-sm font-semibold">
        Section title
        <input
          value={section.title}
          onChange={(event) =>
            onUpdate({
              ...content,
              modules: (content.modules as Module[]).map((item, index) =>
                index === moduleIndex
                  ? {
                      ...item,
                      sections: item.sections.map((entry, childIndex) =>
                        childIndex === sectionIndex
                          ? { ...entry, title: event.target.value }
                          : entry,
                      ),
                    }
                  : item,
              ),
            })
          }
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal"
        />
      </label>
      <div className="rounded-lg border border-slate-200 p-3">
        <p className="text-sm font-semibold">{section.blocks.length} blocks</p>
        {summary ? (
          <p className="mt-1 text-xs text-slate-500">{summary}</p>
        ) : null}
      </div>
      <div>
        <h4 className="mb-2 text-sm font-semibold">Content blocks</h4>
        {section.blocks.length ? (
          <div className="space-y-2">
            {section.blocks.map((block, blockIndex) => {
              const id = `m-${moduleIndex}-s-${sectionIndex}-b-${blockIndex}`;
              const path = { moduleIndex, sectionIndex, blockIndex };
              return (
                <div
                  key={id}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <button
                    type="button"
                    onClick={() => onSelect(id)}
                    className="block w-full text-left"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold">
                        Block {blockIndex + 1} of {section.blocks.length} ·{" "}
                        {safeBlockTitle(block)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {block.blockType}
                      </span>
                    </div>
                    {safeBlockSummary(block) ? (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {safeBlockSummary(block)}
                      </p>
                    ) : null}
                  </button>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onSelect(id)}
                      className="text-xs font-semibold text-royalBlue"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onMutate(duplicateJourneyBlock(content as never, path))
                      }
                      className="text-xs"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      disabled={blockIndex === 0}
                      onClick={() =>
                        onMutate(moveJourneyBlock(content as never, path, "up"))
                      }
                      className="text-xs disabled:opacity-40"
                    >
                      Move Up
                    </button>
                    <button
                      type="button"
                      disabled={blockIndex === section.blocks.length - 1}
                      onClick={() =>
                        onMutate(
                          moveJourneyBlock(content as never, path, "down"),
                        )
                      }
                      className="text-xs disabled:opacity-40"
                    >
                      Move Down
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onMutate(removeJourneyBlock(content as never, path))
                      }
                      className="text-xs text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
            This section has no content blocks yet.
          </p>
        )}
      </div>
    </div>
  );
}

function SubsectionWorkspace({
  subsection,
  moduleIndex,
  sectionIndex,
  subsectionIndex,
  content,
  onUpdate,
  onRemove,
  uploadContext,
}: {
  subsection: Subsection;
  moduleIndex: number;
  sectionIndex: number;
  subsectionIndex: number;
  content: JsonObject;
  onUpdate: (next: JsonObject) => void;
  onRemove: () => void;
  uploadContext: MediaUploadContext;
}) {
  const updateSubsection = (next: Subsection) =>
    onUpdate({
      ...content,
      schemaVersion: 2,
      modules: (content.modules as Module[]).map((module, mi) =>
        mi !== moduleIndex
          ? module
          : {
              ...module,
              sections: module.sections.map((section, si) =>
                si !== sectionIndex
                  ? section
                  : {
                      ...section,
                      subsections: (section.subsections ?? []).map(
                        (item, ssi) => (ssi === subsectionIndex ? next : item),
                      ),
                    },
              ),
            },
      ),
    });
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-royalBlue">
            Selected subsection
          </p>
          <h3 className="mt-1 text-2xl font-semibold text-navy">
            {subsection.title}
          </h3>
          <p className="text-sm text-slate-500">
            {sectionIndex + 1}.{subsectionIndex + 1} ·{" "}
            {subsection.blocks.length} blocks
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg border border-red-200 px-3 text-sm text-red-700"
        >
          Remove Subsection
        </button>
      </div>
      <label className="block text-sm font-semibold">
        Subsection title
        <input
          value={subsection.title}
          onChange={(event) =>
            updateSubsection({ ...subsection, title: event.target.value })
          }
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal"
        />
      </label>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Content blocks</h4>
          <button
            type="button"
            onClick={() =>
              updateSubsection({
                ...subsection,
                blocks: [
                  ...subsection.blocks,
                  {
                    blockType: "RICH_TEXT",
                    schemaVersion: 1,
                    payload: { title: "New Block", text: "" },
                  },
                ],
              })
            }
            className="rounded-lg bg-royalBlue px-3 py-2 text-sm font-semibold text-white"
          >
            Add Block
          </button>
        </div>
        {subsection.blocks.length ? (
          <div className="space-y-3">
            {subsection.blocks.map((block, blockIndex) => (
              <div
                key={`${block.id ?? blockIndex}-${blockIndex}`}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    Block {blockIndex + 1} · {block.blockType}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateSubsection({
                        ...subsection,
                        blocks: subsection.blocks.filter(
                          (_, index) => index !== blockIndex,
                        ),
                      })
                    }
                    className="text-xs text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <PayloadEditor
                  key={block.id ?? blockIndex}
                  block={block}
                  uploadContext={uploadContext}
                  onChange={(payload) =>
                    updateSubsection({
                      ...subsection,
                      blocks: subsection.blocks.map((item, index) =>
                        index === blockIndex ? { ...item, payload } : item,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
            This subsection has no blocks yet.
          </p>
        )}
      </div>
    </div>
  );
}

function BlockWorkspaceActions({
  block,
  blockIndex,
  blockCount,
  content,
  path,
  onMutate,
}: {
  block: Block;
  blockIndex: number;
  blockCount: number;
  content: JsonObject;
  path: JourneyEditorNodePath;
  onMutate: (result: JourneyMutationResult) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onMutate(duplicateJourneyBlock(content as never, path))}
        className="min-h-9 rounded-lg border px-3 text-sm"
      >
        Duplicate
      </button>
      <button
        type="button"
        disabled={blockIndex === 0}
        onClick={() => onMutate(moveJourneyBlock(content as never, path, "up"))}
        className="min-h-9 rounded-lg border px-3 text-sm disabled:opacity-40"
      >
        Move up
      </button>
      <button
        type="button"
        disabled={blockIndex === blockCount - 1}
        onClick={() =>
          onMutate(moveJourneyBlock(content as never, path, "down"))
        }
        className="min-h-9 rounded-lg border px-3 text-sm disabled:opacity-40"
      >
        Move down
      </button>
      <button
        type="button"
        onClick={() => onMutate(removeJourneyBlock(content as never, path))}
        className="min-h-9 rounded-lg border border-red-200 px-3 text-sm text-red-700"
      >
        Remove
      </button>
      <span className="self-center text-xs text-slate-500">
        {block.blockType} · Block {blockIndex + 1} of {blockCount}
      </span>
    </div>
  );
}

export function JourneyBusinessEditor({
  slug,
  revisionId,
  initialContentJson,
  mediaUploadsEnabled,
}: {
  slug: string;
  revisionId: string;
  initialContentJson: string;
  mediaUploadsEnabled: boolean;
}) {
  const uploadContext = { slug, revisionId, enabled: mediaUploadsEnabled };
  const [initialState] = useState(() => initialJourneyEditorState(initialContentJson));
  const [content, setContent] = useState(
    initialState.content,
  );
  const [selected, setSelected] = useState("m-0");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"business" | "advanced">("business");
  const [advancedText, setAdvancedText] = useState(initialState.advancedText);
  const [advancedBaseline, setAdvancedBaseline] = useState(initialState.advancedText);
  const [initialError, setInitialError] = useState(initialState.error);
  const [advancedError, setAdvancedError] = useState("");
  const [saveError, setSaveError] = useState("");
  const modules = modulesFrom(content);
  const nodes = useMemo(() => makeNodes(modules), [modules]);
  const visible = nodes.filter(
    (node) =>
      !query ||
      `${node.title} ${node.type}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  const selectedNode = nodes.find((node) => node.id === selected) ?? nodes[0];
  const selectedModule = selectedNode
    ? modules[selectedNode.moduleIndex]
    : undefined;
  const selectedSection =
    selectedModule && selectedNode?.sectionIndex !== undefined
      ? selectedModule.sections[selectedNode.sectionIndex]
      : undefined;
  const selectedBlock =
    selectedSection && selectedNode?.blockIndex !== undefined
      ? selectedSection.blocks[selectedNode.blockIndex]
      : undefined;
  const selectedSubsection =
    selectedSection && selectedNode?.subsectionIndex !== undefined
      ? selectedSection.subsections?.[selectedNode.subsectionIndex]
      : undefined;
  const update = (next: JsonObject) => setContent(next);
  const updateBlock = (payload: JsonObject, blockType?: string) => {
    if (
      !selectedNode ||
      selectedNode.sectionIndex === undefined ||
      selectedNode.blockIndex === undefined
    )
      return;
    update({
      ...content,
      modules: modules.map((module, mi) =>
        mi !== selectedNode.moduleIndex
          ? module
          : {
              ...module,
              sections: module.sections.map((section, si) =>
                si !== selectedNode.sectionIndex
                  ? section
                  : {
                      ...section,
                      blocks: section.blocks.map((block, bi) =>
                        bi !== selectedNode.blockIndex
                          ? block
                          : {
                              ...block,
                              payload,
                              ...(blockType ? { blockType } : {}),
                            },
                      ),
                    },
              ),
            },
      ),
    });
  };
  const moveSibling = (direction: -1 | 1) => {
    const next = getSiblingNode(nodes, selected, direction);
    if (next) setSelected(next.id);
  };
  const breadcrumbs = buildEditorBreadcrumb(
    nodes,
    selected,
    typeof content.title === "string" ? content.title : "Journey",
  );
  const applyAdvanced = () => {
    const result = parseAdvancedJourneyText(advancedText);
    if (!result.ok) {
      setAdvancedError(result.error);
      return;
    }
    const next = result.content;
    setContent(next);
    const formatted = JSON.stringify(next, null, 2);
    setAdvancedText(formatted);
    setAdvancedBaseline(formatted);
    setAdvancedError("");
    setInitialError("");
    setSelected(makeNodes(modulesFrom(next))[0]?.id ?? "");
    setMode("business");
  };
  const toggleMode = () => {
    if (mode === "business") {
      const formatted = JSON.stringify(content, null, 2);
      setAdvancedText(formatted);
      setAdvancedBaseline(formatted);
      setAdvancedError("");
      setMode("advanced");
      return;
    }
    const result = parseAdvancedJourneyText(advancedText);
    if (!result.ok) {
      setAdvancedError(
        `${result.error} Fix it before leaving Advanced JSON mode.`,
      );
      return;
    }
    setContent(result.content);
    const formatted = JSON.stringify(result.content, null, 2);
    setAdvancedText(formatted);
    setAdvancedBaseline(formatted);
    setAdvancedError("");
    setMode("business");
  };
  const submitDraft = (event: React.FormEvent<HTMLFormElement>) => {
    const result = resolveJourneyEditorSave({ mode, content, advancedText });
    if (!result.ok) {
      event.preventDefault();
      setAdvancedError(result.error);
      return;
    }
    const form = event.currentTarget;
    const title = form.elements.namedItem("title") as HTMLInputElement | null;
    const summary = form.elements.namedItem("summary") as HTMLInputElement | null;
    const contentJson = form.elements.namedItem("contentJson") as HTMLInputElement | null;
    if (!title || !summary || !contentJson) {
      event.preventDefault();
      setSaveError("The editor could not prepare this draft for saving.");
      return;
    }
    title.value = result.payload.title;
    summary.value = result.payload.summary;
    contentJson.value = result.payload.contentJson;
    const byteLength = new TextEncoder().encode(result.payload.contentJson).byteLength;
    if (byteLength > MAX_JOURNEY_CONTENT_BYTES) {
      event.preventDefault();
      setSaveError(
        `This draft is ${(byteLength / 1024 / 1024).toFixed(1)} MB. The maximum is ${(MAX_JOURNEY_CONTENT_BYTES / 1024 / 1024).toFixed(0)} MB; remove embedded media or use an HTTPS image URL before saving.`,
      );
      return;
    }
    setAdvancedError("");
    setSaveError("");
  };
  const applyJourneyMutation = (result: JourneyMutationResult) => {
    if (result.ok) {
      setContent(result.content as JsonObject);
      const path = result.selectedPath;
      setSelected(
        path.moduleIndex === undefined
          ? "m-0"
          : path.blockIndex !== undefined
            ? `m-${path.moduleIndex}-s-${path.sectionIndex}-b-${path.blockIndex}`
            : path.sectionIndex !== undefined
              ? `m-${path.moduleIndex}-s-${path.sectionIndex}`
              : `m-${path.moduleIndex}`,
      );
    }
  };

  function renderSelectedWorkspace() {
    void editorModeLabels;
    if (!selectedNode)
      return (
        <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
          No content selected.
        </p>
      );
    if (selectedNode.type === "module" && selectedModule)
      return (
        <>
          <ModuleWorkspace
            module={selectedModule}
            moduleIndex={selectedNode.moduleIndex}
            totalModules={modules.length}
            sections={selectedModule.sections}
            content={content}
            onUpdate={update}
            onSelect={setSelected}
            onPrevious={() => {
              const previous = getSiblingNode(nodes, selected, -1);
              if (previous) setSelected(previous.id);
            }}
            onNext={() => {
              const next = getSiblingNode(nodes, selected, 1);
              if (next) setSelected(next.id);
            }}
          />
          <LevelImageEditor level="Module" media={selectedModule.media} uploadContext={uploadContext}
            onChange={(media) => applyJourneyMutation(updateJourneyModuleMedia(content as never, selectedNode.moduleIndex, media))} />
        </>
      );
    if (selectedNode.type === "section" && selectedSection && selectedModule)
      return (
        <>
        <SectionWorkspace
          section={selectedSection}
          module={selectedModule}
          moduleIndex={selectedNode.moduleIndex}
          sectionIndex={selectedNode.sectionIndex ?? 0}
          content={content}
          onUpdate={update}
          onSelect={setSelected}
          onMutate={applyJourneyMutation}
          onPrevious={() => {
            const previous = getSiblingNode(nodes, selected, -1);
            if (previous) setSelected(previous.id);
          }}
          onNext={() => {
            const next = getSiblingNode(nodes, selected, 1);
            if (next) setSelected(next.id);
          }}
        />
          <LevelImageEditor level="Section" media={selectedSection.media} uploadContext={uploadContext}
            onChange={(media) => applyJourneyMutation(updateJourneySectionMedia(content as never, selectedNode.moduleIndex, selectedNode.sectionIndex ?? 0, media))} />
        </>
      );
    if (
      selectedNode.type === "subsection" &&
      selectedSubsection &&
      selectedSection
    )
      return (
        <>
        <SubsectionWorkspace
          subsection={selectedSubsection}
          moduleIndex={selectedNode.moduleIndex}
          sectionIndex={selectedNode.sectionIndex ?? 0}
          subsectionIndex={selectedNode.subsectionIndex ?? 0}
          content={content}
          onUpdate={update}
          uploadContext={uploadContext}
          onRemove={() =>
            applyJourneyMutation(
              removeJourneySubsection(
                content as never,
                selectedNode.moduleIndex,
                selectedNode.sectionIndex ?? 0,
                selectedNode.subsectionIndex ?? 0,
              ),
            )
          }
        />
          <LevelImageEditor level="Subsection" media={selectedSubsection.media} uploadContext={uploadContext}
            onChange={(media) => applyJourneyMutation(updateJourneySubsectionMedia(content as never, selectedNode.moduleIndex, selectedNode.sectionIndex ?? 0, selectedNode.subsectionIndex ?? 0, media))} />
        </>
      );
    if (selectedNode.type === "block" && selectedBlock && selectedSection)
      return (
        <>
          <BlockWorkspaceActions
            block={selectedBlock}
            blockIndex={selectedNode.blockIndex ?? 0}
            blockCount={selectedSection.blocks.length}
            content={content}
            path={{
              moduleIndex: selectedNode.moduleIndex,
              sectionIndex: selectedNode.sectionIndex,
              blockIndex: selectedNode.blockIndex,
            }}
            onMutate={applyJourneyMutation}
          />
          <label className="mb-4 block text-sm font-semibold">
            Block type
            <select
              value={selectedBlock.blockType}
              onChange={(event) => applyJourneyMutation(updateJourneyBlockType(
                content as never,
                { moduleIndex: selectedNode.moduleIndex, sectionIndex: selectedNode.sectionIndex, blockIndex: selectedNode.blockIndex },
                event.target.value as never,
              ))}
              className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 font-normal"
            >
              {blockTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <PayloadEditor
            key={selectedBlock.id ?? selectedNode.id}
            block={selectedBlock}
            onChange={updateBlock}
            uploadContext={uploadContext}
          />
        </>
      );
    switch (selectedNode.type) {
      case "module":
        return selectedModule ? (
          <>
            <p className="mt-2 text-sm text-slate-500">
              {selectedModule.key ?? "No module key"} ·{" "}
              {selectedModule.sections.length} sections ·{" "}
              {selectedModule.sections.reduce(
                (count, section) => count + section.blocks.length,
                0,
              )}{" "}
              blocks
            </p>
            <label className="mt-5 block text-sm font-semibold">
              Module title
              <input
                value={selectedModule.title}
                onChange={(event) =>
                  update({
                    ...content,
                    modules: modules.map((module, index) =>
                      index === selectedNode.moduleIndex
                        ? { ...module, title: event.target.value }
                        : module,
                    ),
                  })
                }
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal"
              />
            </label>
          </>
        ) : null;
      case "section":
        return selectedSection ? (
          <label className="block text-sm font-semibold">
            Section title
            <input
              value={selectedSection.title}
              onChange={(event) =>
                update({
                  ...content,
                  modules: modules.map((module, index) =>
                    index === selectedNode.moduleIndex
                      ? {
                          ...module,
                          sections: module.sections.map(
                            (section, sectionIndex) =>
                              sectionIndex === selectedNode.sectionIndex
                                ? { ...section, title: event.target.value }
                                : section,
                          ),
                        }
                      : module,
                  ),
                })
              }
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal"
            />
          </label>
        ) : null;
      case "block":
        return selectedBlock ? (
          <>
            <label className="block text-sm font-semibold">
              Block type
              <select
                value={selectedBlock.blockType}
                onChange={(event) => applyJourneyMutation(updateJourneyBlockType(
                  content as never,
                  { moduleIndex: selectedNode.moduleIndex, sectionIndex: selectedNode.sectionIndex, blockIndex: selectedNode.blockIndex },
                  event.target.value as never,
                ))}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal"
              >
                {blockTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <div className="mt-5">
              <PayloadEditor
                key={selectedBlock.id ?? selectedNode.id}
                block={selectedBlock}
                onChange={updateBlock}
                uploadContext={uploadContext}
              />
            </div>
          </>
        ) : null;
      default:
        return (
          <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
            No content selected.
          </p>
        );
    }
  }

  const siblingControls = (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={!getSiblingNode(nodes, selected, -1)}
        onClick={() => moveSibling(-1)}
        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-2 text-sm disabled:opacity-40"
      >
        <ChevronLeft size={16} />
        Previous
      </button>
      <button
        type="button"
        disabled={!getSiblingNode(nodes, selected, 1)}
        onClick={() => moveSibling(1)}
        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-2 text-sm disabled:opacity-40"
      >
        Next
        <ChevronRight size={16} />
      </button>
    </div>
  );
  if (initialError) {
    return (
      <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Draft recovery required</p>
        <h2 className="mt-2 text-xl font-semibold text-navy">This draft contains invalid JSON.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">No change has been saved. Correct the JSON below, then apply it to recover the structured editor.</p>
        <AdvancedJsonEditor
          text={advancedText}
          error={advancedError || initialError}
          dirty
          onTextChange={(next) => {
            setAdvancedText(next);
            setAdvancedError("");
          }}
          onApply={applyAdvanced}
        />
      </section>
    );
  }
  return (
    <form
      action={saveJourneyDraftAction}
      onSubmit={submitDraft}
      className="mt-5 min-w-0"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="revisionId" value={revisionId} />
      <input type="hidden" name="title" defaultValue="" />
      <input type="hidden" name="summary" defaultValue="" />
      <input type="hidden" name="contentJson" defaultValue="" />
      <RevisionToolbar
        moduleCount={modules.length}
        mode={mode}
        onToggleAdvanced={toggleMode}
      >
        <button className="min-h-10 rounded-lg bg-royalBlue px-4 text-sm font-semibold text-white">
          Save Draft
        </button>
      </RevisionToolbar>
      {saveError ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {saveError}
        </p>
      ) : null}
      {mode === "advanced" ? (
        <AdvancedJsonEditor
          text={advancedText}
          error={advancedError}
          dirty={advancedText !== advancedBaseline}
          onTextChange={(next) => {
            setAdvancedText(next);
            setAdvancedError("");
          }}
          onApply={applyAdvanced}
        />
      ) : (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <ContentNavigator
            nodes={visible}
            query={query}
            onQueryChange={setQuery}
            selected={selected}
            onSelect={setSelected}
          />
          <SelectedContentWorkspace
            breadcrumb={breadcrumbs.map((item, index) => (
              <span
                key={`${item.label}-${index}`}
                className="inline-flex items-center gap-1"
              >
                {index ? <ChevronRight size={14} aria-hidden="true" /> : null}
                {item.current ? (
                  <span className="font-semibold text-slate-700">
                    {item.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      item.id && item.id !== "journey" && setSelected(item.id)
                    }
                    className="hover:text-royalBlue"
                  >
                    {item.label}
                  </button>
                )}
              </span>
            ))}
            context={
              selectedNode ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-royalBlue">
                    Selected {selectedNode.type}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-navy">
                    {selectedNode.title}
                  </h2>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Legacy Journey content
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-navy">
                    Use Advanced JSON to inspect or upgrade this Draft
                  </h2>
                </>
              )
            }
            navigation={siblingControls}
          >
            {renderSelectedWorkspace()}
          </SelectedContentWorkspace>
        </div>
      )}
    </form>
  );
}
