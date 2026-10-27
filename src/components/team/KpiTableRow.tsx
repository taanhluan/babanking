'use client';
import { useState, type MouseEvent, type ReactNode } from 'react';

/**
 * A KPI table row that expands into a detail row below it. Clicking anywhere on the row toggles it,
 * except on its own controls (target input, Remove).
 */
export function KpiTableRow({ kpiId, columns, removed, label, actions, detail, children }: {
  kpiId: string;
  columns: number;
  removed: boolean;
  label: string;
  actions?: ReactNode;
  detail: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `kpi-${kpiId}`;

  function onRowClick(event: MouseEvent<HTMLTableRowElement>) {
    if ((event.target as HTMLElement).closest('input, select, textarea, button, a, label')) return;
    setOpen((value) => !value);
  }

  return (
    <>
      <tr onClick={onRowClick} className={`cursor-pointer border-t border-slate-100 align-top hover:bg-slate-50/70 ${open ? 'bg-slate-50/70' : ''} ${removed ? 'text-slate-400' : ''}`}>
        {children}
        <td className="whitespace-nowrap py-3">
          <span className="flex items-center gap-3">
            <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls={panelId} className="inline-flex min-h-10 items-center gap-1 font-semibold text-royalBlue hover:underline">
              {label}
              <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}><path fill="currentColor" d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" /></svg>
            </button>
            {actions}
          </span>
        </td>
      </tr>
      <tr id={panelId} hidden={!open} className="scroll-mt-24 bg-slate-50/70">
        <td colSpan={columns} className="px-3 pb-4 pt-1 whitespace-normal">{detail}</td>
      </tr>
    </>
  );
}
