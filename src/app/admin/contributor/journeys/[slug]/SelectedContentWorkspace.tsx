'use client';

import type { ReactNode } from 'react';

export function SelectedContentWorkspace({ breadcrumb, context, navigation, children }: { breadcrumb: ReactNode; context: ReactNode; navigation: ReactNode; children: ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5"><nav aria-label="Content path" className="flex flex-wrap items-center gap-1 text-sm text-slate-500">{breadcrumb}</nav><div className="mt-3 flex flex-wrap items-start justify-between gap-3"><div>{context}</div><div>{navigation}</div></div><div className="mt-5">{children}</div></section>;
}
