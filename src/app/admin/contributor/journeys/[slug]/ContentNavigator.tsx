'use client';

import type { EditorNode } from './journey-editor-navigation';

export function ContentNavigator({ nodes, query, onQueryChange, selected, onSelect }: { nodes: EditorNode[]; query: string; onQueryChange: (value: string) => void; selected: string; onSelect: (id: string) => void }) {
  return <aside className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 lg:sticky lg:top-32 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto"><label className="block text-sm font-semibold">Search<input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="AML, FX, API..." className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label><nav aria-label="CMS content tree" className="mt-4 space-y-1">{nodes.map((node) => <button key={node.id} type="button" onClick={() => onSelect(node.id)} className={`block min-h-10 w-full rounded-lg px-3 text-left text-sm ${selected === node.id ? 'bg-blue-50 font-semibold text-royalBlue' : 'text-slate-700'}`} style={{ paddingLeft: `${12 + (node.depth ?? 0) * 16}px` }}>{node.type === 'module' ? '▣' : node.type === 'section' ? '▤' : '•'} {node.title}</button>)}{!nodes.length ? <p className="p-3 text-sm text-slate-500">No matching content.</p> : null}</nav></aside>;
}
