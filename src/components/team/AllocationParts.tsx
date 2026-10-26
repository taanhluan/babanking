import Link from 'next/link';
import type { Route } from 'next';
import type { SupportedLocale } from '@/i18n/config';
import { getLocalizedPath } from '@/i18n/routing';
import { assignmentStatus, type AllocationSummary, type ForecastStatus } from '@/server/ba-team/ba-allocation-domain';
import type { BaAssignmentView } from '@/server/ba-team/ba-allocation-repository';
import {
  allocationCopy, assignmentStatusLabels, assignmentStatusTone, billableLabels, forecastLabels, forecastTone, performanceLabels, riskLabels, riskTone,
  type AllocationCopy,
} from './allocation-copy';
import { Badge, cardClass } from './TeamShell';

export function formatDay(date: string | null, locale: SupportedLocale) {
  if (!date) return '—';
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

export function ForecastBadge({ status, locale }: { status: ForecastStatus; locale: SupportedLocale }) {
  return <Badge tone={forecastTone[status]}>{forecastLabels[locale][status]}</Badge>;
}

export function nextAvailableLabel(summary: AllocationSummary, today: string, copy: AllocationCopy, locale: SupportedLocale) {
  if (!summary.nextAvailable) return copy.notInSight;
  return summary.nextAvailable === today ? copy.now : formatDay(summary.nextAvailable, locale);
}

/** Minimal assignment data sent to the client form for the over-allocation projection. */
export function projectionOf(assignments: BaAssignmentView[]) {
  return assignments.map(({ id, percent, billableStatus, startDate, endDate, cancelled }) => ({ id, percent, billableStatus, startDate, endDate, cancelled }));
}

/** Labels for the client assignment form (plain strings only). */
export function assignmentFormLabels(copy: AllocationCopy, locale: SupportedLocale, submit: string) {
  return {
    ba: copy.ba, project: copy.project, role: copy.role, percent: copy.percent, billable: copy.billable, startDate: copy.startDate, endDate: copy.endDate,
    endDateHint: copy.endDateHint, overConfirm: copy.overConfirm, submit, internal: copy.internal, billableLabels: billableLabels[locale],
  };
}

export function SummaryTiles({ summary, today, copy, locale }: { summary: AllocationSummary; today: string; copy: AllocationCopy; locale: SupportedLocale }) {
  const tiles: Array<[string, React.ReactNode]> = [
    [copy.capacity, `${summary.capacity}%`],
    [copy.allocation, `${summary.allocation}%`],
    [copy.available, summary.overAllocated ? <span className="text-red-700">{summary.available}%</span> : `${summary.available}%`],
    [copy.nextAvailable, nextAvailableLabel(summary, today, copy, locale)],
  ];
  return (
    <section className="mb-5 grid gap-3">
      <div className="grid gap-3 sm:grid-cols-4">
        {tiles.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-navy">{value}</p></div>)}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ForecastBadge status={summary.forecast} locale={locale} />
        <Badge>{copy.billableUtilization}: {summary.billableUtilization}%</Badge>
        {summary.partialBillable ? <Badge>{copy.partialBillable}: {summary.partialBillable}%</Badge> : null}
      </div>
      {summary.overAllocated ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{copy.overWarning}</p> : null}
    </section>
  );
}

/** One assignment line: customer · project · role · % · billable · dates, plus status and Lead notes. */
export function AssignmentLine({ assignment, today, locale, href }: { assignment: BaAssignmentView; today: string; locale: SupportedLocale; href?: string }) {
  const copy = allocationCopy[locale];
  const status = assignmentStatus(assignment, today);
  const title = `${assignment.project.customer.name} · ${assignment.project.name}`;
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${status === 'CANCELLED' ? 'opacity-60' : ''}`}>
      <div className="min-w-0">
        {href ? <Link href={getLocalizedPath(href, locale) as Route} className="break-words font-semibold text-navy underline-offset-2 hover:text-royalBlue hover:underline">{title}</Link> : <p className="break-words font-semibold text-navy">{title}</p>}
        <p className="text-sm text-textSecondary">{assignment.role.name} · {assignment.percent}% · {billableLabels[locale][assignment.billableStatus]} · {formatDay(assignment.startDate, locale)} – {assignment.endDate ? formatDay(assignment.endDate, locale) : '…'}</p>
        {assignment.managerRemark ? <p className="mt-1 break-words text-sm text-slate-700"><span className="font-semibold">{copy.managerRemark}: </span>{assignment.managerRemark}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={assignmentStatusTone[status]}>{assignmentStatusLabels[locale][status]}</Badge>
        {assignment.performance ? <Badge>{copy.performance}: {performanceLabels[locale][assignment.performance]}</Badge> : null}
        {assignment.risk ? <Badge tone={riskTone[assignment.risk]}>{copy.risk}: {riskLabels[locale][assignment.risk]}</Badge> : null}
      </div>
    </div>
  );
}

export type HistoryEntry = { id: string; action: string; entityId: string; createdAt: Date; metadataJson: string | null; actor: { name: string } | null };
type Names = { projects: Record<string, string>; roles: Record<string, string> };

function describeChange(field: string, value: unknown, names: Names, locale: SupportedLocale) {
  if (value === null || value === undefined) return '—';
  if (field === 'projectId') return names.projects[String(value)] ?? '?';
  if (field === 'roleId') return names.roles[String(value)] ?? '?';
  if (field === 'percent') return `${value}%`;
  if (field === 'billableStatus') return billableLabels[locale][value as keyof (typeof billableLabels)['en']] ?? String(value);
  return formatDay(String(value), locale);
}

const fieldLabel = (copy: AllocationCopy, field: string) => ({ projectId: copy.project, roleId: copy.role, percent: copy.percent, billableStatus: copy.billable, startDate: copy.startDate, endDate: copy.endDate } as Record<string, string>)[field] ?? field;

export function AllocationHistory({ entries, names, locale, showSubject }: { entries: HistoryEntry[]; names: Names; locale: SupportedLocale; showSubject?: Record<string, string> }) {
  const copy = allocationCopy[locale];
  const format = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold text-navy">{copy.history}</h2>
      {entries.length ? (
        <ul className="mt-3 grid gap-2 text-sm">
          {entries.map((entry) => {
            let metadata: { changes?: Record<string, { from: unknown; to: unknown }>; overAllocationConfirmed?: boolean; subjectUserId?: string } = {};
            try { metadata = entry.metadataJson ? JSON.parse(entry.metadataJson) : {}; } catch { /* history stays readable without metadata */ }
            const created = entry.action === 'BA_ALLOCATION_CREATED';
            return (
              <li key={entry.id} className="rounded-lg bg-slate-50 p-3">
                <span className="font-semibold">{copy.historyActions[entry.action] ?? entry.action}</span>
                {showSubject && metadata.subjectUserId ? <span className="text-textSecondary"> · {showSubject[metadata.subjectUserId] ?? ''}</span> : null}
                {metadata.overAllocationConfirmed ? <span className="text-red-700"> · {copy.overConfirmedNote}</span> : null}
                {metadata.changes ? (
                  <ul className="mt-1 grid gap-0.5 text-textSecondary">
                    {Object.entries(metadata.changes).map(([field, change]) => <li key={field}>{fieldLabel(copy, field)}: {created ? '' : `${describeChange(field, change.from, names, locale)} → `}{describeChange(field, change.to, names, locale)}</li>)}
                  </ul>
                ) : null}
                <span className="mt-1 block text-xs text-slate-500">{entry.actor?.name ?? '—'} · {format.format(entry.createdAt)}</span>
              </li>
            );
          })}
        </ul>
      ) : <p className="mt-2 text-sm text-textSecondary">{copy.noHistory}</p>}
    </section>
  );
}

export type AllocationSection = 'table' | 'timeline' | 'report' | 'settings';

/** Second-level navigation inside the Lead's allocation area. */
export function AllocationNav({ active, locale }: { active: AllocationSection; locale: SupportedLocale }) {
  const copy = allocationCopy[locale];
  const links: Array<[AllocationSection, string]> = [['table', '/team/allocation'], ['timeline', '/team/allocation/timeline'], ['report', '/team/allocation/report'], ['settings', '/team/allocation/settings']];
  return (
    <nav aria-label={copy.teamTitle} className="mb-5 flex flex-wrap gap-2">
      {links.map(([key, href]) => <Link key={key} href={getLocalizedPath(href, locale) as Route} aria-current={active === key ? 'page' : undefined} className={`rounded-full border px-4 py-2 text-sm font-semibold ${active === key ? 'border-royalBlue bg-blue-50 text-royalBlue' : 'border-slate-300 bg-white text-slate-600 hover:border-royalBlue'}`}>{copy.subnav[key]}</Link>)}
    </nav>
  );
}

export function forecastLegend(locale: SupportedLocale, omit: ForecastStatus[] = []) {
  return (Object.keys(forecastLabels[locale]) as ForecastStatus[]).filter((status) => !omit.includes(status)).map((status) => <ForecastBadge key={status} status={status} locale={locale} />);
}
