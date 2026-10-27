'use client';
import { useState } from 'react';
import { kpiComparators } from '@/server/ba-team/ba-plan-domain';
import { inputClass } from './team-styles';

const disabledClass = 'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

type Labels = { comparator: string; target: string; unit: string; comparators: Record<(typeof kpiComparators)[number], string>; milestoneHint?: string };

/**
 * Comparator, target and unit inputs. A milestone ("Done / not done") has no target or unit to choose, so both are
 * disabled; disabled inputs are not posted and the server fixes the milestone target (`normalizeKpiInput`).
 */
export function ComparatorTargetFields({ labels, comparator = 'GTE', targetValue, unitLabel, unitPlaceholder = '%', unitClassName = '' }: { labels: Labels; comparator?: string; targetValue?: number; unitLabel?: string; unitPlaceholder?: string; unitClassName?: string }) {
  const [value, setValue] = useState(comparator);
  const [target, setTarget] = useState(targetValue === undefined || comparator === 'DONE' ? '' : String(targetValue));
  const [unit, setUnit] = useState(comparator === 'DONE' ? '' : unitLabel ?? '');
  const milestone = value === 'DONE';
  return (
    <>
      <label className="block min-w-0 text-sm font-semibold">{labels.comparator}
        <select name="comparator" value={value} onChange={(event) => setValue(event.target.value)} className={inputClass}>
          {kpiComparators.map((option) => <option key={option} value={option}>{labels.comparators[option]}</option>)}
        </select>
        {milestone && labels.milestoneHint ? <span className="mt-1 block text-xs font-normal text-slate-500">{labels.milestoneHint}</span> : null}
      </label>
      <label className="block min-w-0 text-sm font-semibold">{labels.target}
        <input required={!milestone} disabled={milestone} name="targetValue" type="number" step="any" value={milestone ? '' : target} onChange={(event) => setTarget(event.target.value)} placeholder={milestone ? '—' : undefined} className={`${inputClass} ${disabledClass}`} />
      </label>
      <label className={`block min-w-0 text-sm font-semibold ${unitClassName}`}>{labels.unit}
        <input required={!milestone} disabled={milestone} name="unitLabel" maxLength={60} placeholder={milestone ? '—' : unitPlaceholder} value={milestone ? '' : unit} onChange={(event) => setUnit(event.target.value)} className={`${inputClass} ${disabledClass}`} />
      </label>
    </>
  );
}
