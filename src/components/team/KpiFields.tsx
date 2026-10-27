import { capabilityAreas, type CapabilityArea } from '@/server/ba-team/ba-plan-domain';
import type { SupportedLocale } from '@/i18n/config';
import { ComparatorTargetFields } from './ComparatorTargetFields';
import { inputClass } from './TeamShell';
import { capabilityAreaLabels, type TeamCopy } from './team-copy';

type KpiValues = { objectiveId?: string | null; name?: string; description?: string | null; capabilityArea?: string | null; comparator?: string; targetValue?: number; unitLabel?: string };

/** Shared KPI definition inputs used by quarter KPI forms and the template library. */
export function KpiFields({ copy, locale, values = {}, requireArea = false, objectives }: { copy: TeamCopy; locale: SupportedLocale; values?: KpiValues; requireArea?: boolean; objectives?: Array<{ id: string; title: string }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {objectives ? <ObjectiveSelect copy={copy} objectives={objectives} value={values.objectiveId} className="sm:col-span-2 lg:col-span-4" /> : null}
      <label className="block min-w-0 text-sm font-semibold sm:col-span-2">{copy.kpi}<input required name="name" maxLength={200} defaultValue={values.name} className={inputClass} /></label>
      <label className="block min-w-0 text-sm font-semibold sm:col-span-2">{copy.capabilityArea}
        <select name="capabilityArea" required={requireArea} defaultValue={values.capabilityArea ?? ''} className={inputClass}>
          {requireArea ? null : <option value="">—</option>}
          {capabilityAreas.map((area) => <option key={area} value={area}>{capabilityAreaLabels[locale][area as CapabilityArea]}</option>)}
        </select>
      </label>
      <ComparatorTargetFields labels={comparatorLabels(copy)} comparator={values.comparator} targetValue={values.targetValue} unitLabel={values.unitLabel} unitPlaceholder="%, / 5, / quarter" unitClassName="sm:col-span-2" />
      <label className="block min-w-0 text-sm font-semibold sm:col-span-2 lg:col-span-4">{copy.kpiDescription}<input name="description" maxLength={1000} defaultValue={values.description ?? ''} className={inputClass} /></label>
    </div>
  );
}

/** Links a KPI to one of the quarter's Objectives, making it a Key Result of that Objective. */
export function ObjectiveSelect({ copy, objectives, value, className = '' }: { copy: TeamCopy; objectives: Array<{ id: string; title: string }>; value?: string | null; className?: string }) {
  return (
    <label className={`block min-w-0 text-sm font-semibold ${className}`}>{copy.okr.objective}
      <select name="objectiveId" defaultValue={value ?? ''} className={inputClass}>
        <option value="">{copy.okr.unlinked}</option>
        {objectives.map((objective, index) => <option key={objective.id} value={objective.id}>O{index + 1}. {objective.title}</option>)}
      </select>
    </label>
  );
}

/** Labels for `ComparatorTargetFields`; only plain strings cross into the client component. */
export function comparatorLabels(copy: TeamCopy, withHint = true) {
  return { comparator: copy.comparator, target: copy.target, unit: copy.unit, comparators: copy.comparators, milestoneHint: withHint ? copy.milestoneHint : undefined };
}

export function ReasonField({ copy, name = 'reason' }: { copy: TeamCopy; name?: string }) {
  return <label className="block text-sm font-semibold">{copy.reasonPlaceholder}<textarea required name={name} minLength={10} maxLength={1000} rows={2} className={inputClass} /></label>;
}
