import { capabilityAreas, type CapabilityArea } from '@/server/ba-team/ba-plan-domain';
import type { SupportedLocale } from '@/i18n/config';
import { inputClass } from './TeamShell';
import { capabilityAreaLabels, type TeamCopy } from './team-copy';

type KpiValues = { name?: string; description?: string | null; capabilityArea?: string | null; comparator?: string; targetValue?: number; unitLabel?: string };

/** Shared KPI definition inputs used by quarter KPI forms and the template library. */
export function KpiFields({ copy, locale, values = {}, requireArea = false }: { copy: TeamCopy; locale: SupportedLocale; values?: KpiValues; requireArea?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="block min-w-0 text-sm font-semibold sm:col-span-2">{copy.kpi}<input required name="name" maxLength={200} defaultValue={values.name} className={inputClass} /></label>
      <label className="block min-w-0 text-sm font-semibold sm:col-span-2">{copy.capabilityArea}
        <select name="capabilityArea" required={requireArea} defaultValue={values.capabilityArea ?? ''} className={inputClass}>
          {requireArea ? null : <option value="">—</option>}
          {capabilityAreas.map((area) => <option key={area} value={area}>{capabilityAreaLabels[locale][area as CapabilityArea]}</option>)}
        </select>
      </label>
      <label className="block min-w-0 text-sm font-semibold">{copy.comparator}
        <select name="comparator" defaultValue={values.comparator ?? 'GTE'} className={inputClass}><option value="GTE">≥</option><option value="LTE">≤</option></select>
      </label>
      <label className="block min-w-0 text-sm font-semibold">{copy.target}<input required name="targetValue" type="number" step="any" defaultValue={values.targetValue} className={inputClass} /></label>
      <label className="block min-w-0 text-sm font-semibold sm:col-span-2">{copy.unit}<input required name="unitLabel" maxLength={60} placeholder="%, / 5, / quarter" defaultValue={values.unitLabel} className={inputClass} /></label>
      <label className="block min-w-0 text-sm font-semibold sm:col-span-2 lg:col-span-4">{copy.kpiDescription}<input name="description" maxLength={1000} defaultValue={values.description ?? ''} className={inputClass} /></label>
    </div>
  );
}

export function ReasonField({ copy, name = 'reason' }: { copy: TeamCopy; name?: string }) {
  return <label className="block text-sm font-semibold">{copy.reasonPlaceholder}<textarea required name={name} minLength={10} maxLength={1000} rows={2} className={inputClass} /></label>;
}
