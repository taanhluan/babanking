import type { SupportedLocale } from '@/i18n/config';
import { isActiveOn, summarizeAllocations, todayInTeamZone } from '@/server/ba-team/ba-allocation-domain';
import { BaAllocationRepository } from '@/server/ba-team/ba-allocation-repository';
import { AssignmentLine } from './AllocationParts';
import { allocationCopy, levelLabels } from './allocation-copy';
import { cardClass } from './TeamShell';

/**
 * Section 19: the KPI plan reads Level and current assignments from resource allocation instead of
 * re-entering them. Caller must already have authorized access to `userId`'s plan.
 */
export async function AllocationSuggestion({ userId, locale }: { userId: string; locale: SupportedLocale }) {
  const copy = allocationCopy[locale];
  const today = todayInTeamZone();
  const [assignments, profile] = await Promise.all([BaAllocationRepository.listForUser(userId), BaAllocationRepository.capacityFor(userId)]);
  const live = assignments.filter((entry) => !entry.cancelled);
  const active = live.filter((entry) => isActiveOn(entry, today));
  const summary = summarizeAllocations(live, profile.capacityPercent, today);
  return (
    <aside className={`${cardClass} mb-4 border-blue-200 bg-blue-50/40`}>
      <h2 className="font-semibold text-navy">{copy.fromAllocation}</h2>
      <p className="mt-1 text-xs text-slate-600">{copy.fromAllocationHint}</p>
      <p className="mt-3 text-sm"><span className="font-semibold">{copy.level}:</span> {profile.level ? levelLabels[locale][profile.level] : copy.notSet} · <span className="font-semibold">{copy.capacity}:</span> {profile.capacityPercent}% ({profile.hoursPerWeek} {copy.hoursPerWeek.toLowerCase()}) · <span className="font-semibold">{copy.allocation}:</span> {summary.allocation}%</p>
      {active.length ? (
        <ul className="mt-3 grid gap-2">
          {active.map((assignment) => <li key={assignment.id} className="rounded-xl border border-slate-200 bg-white p-3"><AssignmentLine assignment={assignment} today={today} locale={locale} /></li>)}
        </ul>
      ) : <p className="mt-2 text-sm text-textSecondary">{copy.noActiveAssignments}</p>}
    </aside>
  );
}
