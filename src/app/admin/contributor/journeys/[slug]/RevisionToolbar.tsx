'use client';

import type { ReactNode } from 'react';

export function RevisionToolbar({ moduleCount, mode, onToggleAdvanced, children }: { moduleCount: number; mode: 'business' | 'advanced'; onToggleAdvanced: () => void; children: ReactNode }) {
  return <div className="sticky top-16 z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><span className="text-sm font-semibold">Draft editor · {moduleCount} modules</span><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={onToggleAdvanced} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold">{mode === 'advanced' ? 'Business Editor' : 'Advanced JSON'}</button>{children}</div></div>;
}
