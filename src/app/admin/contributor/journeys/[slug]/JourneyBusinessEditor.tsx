'use client';

import { useState } from 'react';
import { saveJourneyDraftAction } from '../actions';

type JsonObject = Record<string, unknown>;
type Block = {
  id?: string;
  blockType: string;
  schemaVersion: number;
  payload: JsonObject;
};
type Section = {
  id?: string;
  key?: string;
  title: string;
  order?: number;
  blocks: Block[];
};
type Module = {
  id?: string;
  key?: string;
  title: string;
  order?: number;
  sections: Section[];
};

const blockTypes = [
  'RICH_TEXT',
  'TABLE',
  'DIAGRAM',
  'IMAGE',
  'API_REFERENCE',
  'CODE',
  'DOWNLOAD',
  'CHECKLIST',
  'REFERENCE',
  'CALLOUT',
] as const;

function modulesFrom(content: JsonObject): Module[] {
  return Array.isArray(content.modules) ? content.modules as Module[] : [];
}

function replaceModules(content: JsonObject, modules: Module[]) {
  return { ...content, modules };
}

function PayloadEditor({
  payload,
  onChange,
}: {
  payload: JsonObject;
  onChange: (payload: JsonObject) => void;
}) {
  const [value, setValue] = useState(JSON.stringify(payload, null, 2));
  const [error, setError] = useState('');
  return <label className="block text-sm font-semibold">
    Block payload
    <textarea
      value={value}
      rows={6}
      onChange={(event) => {
        const next = event.target.value;
        setValue(next);
        try {
          const parsed: unknown = JSON.parse(next);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Payload must be a JSON object.');
          }
          setError('');
          onChange(parsed as JsonObject);
        } catch {
          setError('Payload must be a valid JSON object before saving.');
        }
      }}
      className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs font-normal"
    />
    {error ? <span className="mt-1 block text-xs text-red-700">{error}</span> : null}
  </label>;
}

export function JourneyBusinessEditor({
  slug,
  revisionId,
  initialContentJson,
}: {
  slug: string;
  revisionId: string;
  initialContentJson: string;
}) {
  const initialContent = JSON.parse(initialContentJson) as JsonObject;
  const [content, setContent] = useState(initialContent);
  const [advancedJson, setAdvancedJson] = useState(
    JSON.stringify(initialContent, null, 2),
  );
  const [mode, setMode] = useState<'business' | 'advanced'>('business');
  const [advancedError, setAdvancedError] = useState('');

  const applyContent = (next: JsonObject) => {
    setContent(next);
    setAdvancedJson(JSON.stringify(next, null, 2));
    setAdvancedError('');
  };
  const title = typeof content.title === 'string' ? content.title : '';
  const summary = typeof content.summary === 'string' ? content.summary : '';
  const modules = modulesFrom(content);

  const updateModule = (moduleIndex: number, nextModule: Module) => {
    const next = [...modules];
    next[moduleIndex] = nextModule;
    applyContent(replaceModules(content, next));
  };

  return <form action={saveJourneyDraftAction} className="mt-5">
    <input type="hidden" name="slug" value={slug} />
    <input type="hidden" name="revisionId" value={revisionId} />
    <input type="hidden" name="contentJson" value={JSON.stringify(content)} />

    <div className="mb-5 flex gap-2 border-b border-slate-200">
      <button
        type="button"
        onClick={() => setMode('business')}
        className={`px-4 py-3 text-sm font-semibold ${mode === 'business' ? 'border-b-2 border-royalBlue text-royalBlue' : 'text-slate-600'}`}
      >
        Business Editor
      </button>
      <button
        type="button"
        onClick={() => setMode('advanced')}
        className={`px-4 py-3 text-sm font-semibold ${mode === 'advanced' ? 'border-b-2 border-royalBlue text-royalBlue' : 'text-slate-600'}`}
      >
        Advanced JSON
      </button>
    </div>

    {mode === 'business' ? <div className="space-y-5">
      <label className="block font-semibold">
        Title
        <input
          name="title"
          required
          minLength={5}
          maxLength={160}
          value={title}
          onChange={(event) => applyContent({ ...content, title: event.target.value })}
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal"
        />
      </label>
      <label className="block font-semibold">
        Summary
        <textarea
          name="summary"
          required
          minLength={30}
          maxLength={500}
          rows={4}
          value={summary}
          onChange={(event) => applyContent({ ...content, summary: event.target.value })}
          className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal"
        />
      </label>

      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Modules, sections and blocks</h3>
            <p className="text-sm text-slate-500">Legacy fields remain preserved and can be inspected in Advanced JSON.</p>
          </div>
          <button
            type="button"
            onClick={() => applyContent(replaceModules(content, [
              ...modules,
              {
                id: `module-${modules.length + 1}`,
                title: `Module ${modules.length + 1}`,
                order: modules.length + 1,
                sections: [],
              },
            ]))}
            className="min-h-10 rounded-xl border border-slate-300 px-3 text-sm font-semibold"
          >
            Add module
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {modules.length ? modules.map((module, moduleIndex) => <article key={module.id ?? moduleIndex} className="rounded-xl border border-slate-200 p-4">
            <label className="block text-sm font-semibold">
              Module title
              <input
                value={module.title}
                onChange={(event) => updateModule(moduleIndex, { ...module, title: event.target.value })}
                className="mt-2 min-h-10 w-full rounded-xl border border-slate-300 px-3 font-normal"
              />
            </label>
            <div className="mt-4 space-y-4">
              {module.sections.map((section, sectionIndex) => <section key={section.id ?? sectionIndex} className="rounded-xl bg-slate-50 p-4">
                <label className="block text-sm font-semibold">
                  Section title
                  <input
                    value={section.title}
                    onChange={(event) => {
                      const sections = [...module.sections];
                      sections[sectionIndex] = { ...section, title: event.target.value };
                      updateModule(moduleIndex, { ...module, sections });
                    }}
                    className="mt-2 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"
                  />
                </label>
                <div className="mt-4 space-y-4">
                  {section.blocks.map((block, blockIndex) => <div key={block.id ?? blockIndex} className="rounded-xl border border-slate-200 bg-white p-4">
                    <label className="block text-sm font-semibold">
                      Block type
                      <select
                        value={block.blockType}
                        onChange={(event) => {
                          const blocks = [...section.blocks];
                          blocks[blockIndex] = { ...block, blockType: event.target.value };
                          const sections = [...module.sections];
                          sections[sectionIndex] = { ...section, blocks };
                          updateModule(moduleIndex, { ...module, sections });
                        }}
                        className="mt-2 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"
                      >
                        {blockTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </label>
                    <div className="mt-3">
                      <PayloadEditor
                        payload={block.payload}
                        onChange={(payload) => {
                          const blocks = [...section.blocks];
                          blocks[blockIndex] = { ...block, payload };
                          const sections = [...module.sections];
                          sections[sectionIndex] = { ...section, blocks };
                          updateModule(moduleIndex, { ...module, sections });
                        }}
                      />
                    </div>
                  </div>)}
                  <button
                    type="button"
                    onClick={() => {
                      const sections = [...module.sections];
                      sections[sectionIndex] = {
                        ...section,
                        blocks: [...section.blocks, {
                          id: `block-${section.blocks.length + 1}`,
                          blockType: 'RICH_TEXT',
                          schemaVersion: 1,
                          payload: { content: '' },
                        }],
                      };
                      updateModule(moduleIndex, { ...module, sections });
                    }}
                    className="min-h-10 rounded-xl border border-slate-300 px-3 text-sm font-semibold"
                  >
                    Add block
                  </button>
                </div>
              </section>)}
              <button
                type="button"
                onClick={() => updateModule(moduleIndex, {
                  ...module,
                  sections: [...module.sections, {
                    id: `section-${module.sections.length + 1}`,
                    title: `Section ${module.sections.length + 1}`,
                    order: module.sections.length + 1,
                    blocks: [],
                  }],
                })}
                className="min-h-10 rounded-xl border border-slate-300 px-3 text-sm font-semibold"
              >
                Add section
              </button>
            </div>
          </article>) : <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">This Journey currently uses legacy fields. Add a module when beginning gradual migration, or use Advanced JSON to maintain existing legacy content.</p>}
        </div>
      </section>
    </div> : <div>
      <label className="block font-semibold">
        Complete Journey content JSON
        <textarea
          value={advancedJson}
          rows={28}
          onChange={(event) => {
            const next = event.target.value;
            setAdvancedJson(next);
            try {
              const parsed: unknown = JSON.parse(next);
              if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error('Journey content must be a JSON object.');
              }
              const object = parsed as JsonObject;
              if (object.slug !== undefined && object.slug !== slug) {
                throw new Error('Stable slug cannot be changed.');
              }
              if (typeof object.title !== 'string' || typeof object.summary !== 'string') {
                throw new Error('Title and summary are required.');
              }
              setContent(object);
              setAdvancedError('');
            } catch (error) {
              setAdvancedError(error instanceof Error ? error.message : 'Invalid JSON.');
            }
          }}
          className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm font-normal"
        />
      </label>
      <p className="mt-2 text-xs text-slate-500">
        Title and Summary share state with the Business Editor. Stable slug and system-owned fields are enforced again on the server.
      </p>
      {advancedError ? <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{advancedError}</p> : null}
    </div>}

    {mode === 'advanced' ? <>
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="summary" value={summary} />
    </> : null}
    <button
      disabled={Boolean(advancedError)}
      className="mt-5 min-h-11 rounded-xl border border-royalBlue px-4 font-semibold text-royalBlue disabled:cursor-not-allowed disabled:opacity-50"
    >
      Validate and Save Draft
    </button>
  </form>;
}
