import { addObjectiveAction, removeObjectiveAction, updateObjectiveAction } from '@/app/team/actions';
import type { SupportedLocale } from '@/i18n/config';
import { quarterRange, smartFields, smartGaps, type AnnualGoal, type Quarter } from '@/server/ba-team/ba-plan-domain';
import type { BaPlanQuarterDetail } from '@/server/ba-team/ba-plan-repository';
import { Badge, buttonClass, cardClass, dangerButtonClass, inputClass } from './TeamShell';
import type { TeamCopy } from './team-copy';

type Objective = BaPlanQuarterDetail['objectives'][number];

function Hidden({ planId, quarter, objectiveId }: { planId: string; quarter: number; objectiveId?: string }) {
  return <><input type="hidden" name="planId" value={planId} /><input type="hidden" name="quarter" value={quarter} />{objectiveId ? <input type="hidden" name="objectiveId" value={objectiveId} /> : null}</>;
}

function ObjectiveFields({ copy, values, annualGoals }: { copy: TeamCopy; values?: Objective; annualGoals: AnnualGoal[] }) {
  return (
    <div className="grid gap-3">
      <label className="block min-w-0 text-sm font-semibold">{copy.okr.objective}<input required name="title" minLength={5} maxLength={200} defaultValue={values?.title} className={inputClass} /></label>
      {annualGoals.length ? (
        <label className="block min-w-0 text-sm font-semibold">{copy.goals.servesGoal}
          <select name="annualGoalKey" defaultValue={values?.annualGoalKey ?? ''} className={inputClass}>
            <option value="">{copy.goals.noGoal}</option>
            {annualGoals.map((goal, index) => <option key={goal.key} value={goal.key}>G{index + 1}. {goal.title}</option>)}
          </select>
        </label>
      ) : null}
      {smartFields.map((field) => (
        <label key={field} className="block min-w-0 text-sm font-semibold">
          {copy.okr.smart[field]}
          <span className="block text-xs font-normal text-slate-500">{copy.okr.smartHints[field]}</span>
          <textarea name={field} maxLength={1000} rows={2} defaultValue={values?.[field]} className={inputClass} />
        </label>
      ))}
    </div>
  );
}

/** Quarter OKR: SMART Objectives whose Key Results are the quarter's KPIs; the KPI evaluation itself is unchanged. */
export function ObjectivesSection({ planId, year, quarter, annualGoals, editable, copy, locale }: { planId: string; year: number; quarter: BaPlanQuarterDetail; annualGoals: AnnualGoal[]; editable: boolean; copy: TeamCopy; locale: SupportedLocale }) {
  const deadline = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium' }).format(quarterRange(year, quarter.quarter as Quarter).end);
  const gaps = quarter.status === 'KPI_DRAFT' ? smartGaps(quarter.objectives, quarter.kpis) : [];
  const gapText = gaps.map((gap) => {
    switch (gap.kind) {
      case 'NO_OBJECTIVES': return copy.okr.gaps.noObjectives;
      case 'MISSING_SMART': return `“${gap.title}” ${copy.okr.gaps.missing}: ${gap.fields.map((field) => copy.okr.smart[field]).join(', ')}`;
      case 'NO_KEY_RESULTS': return `“${gap.title}” ${copy.okr.gaps.noKeyResults}`;
      case 'KPI_WITHOUT_OBJECTIVE': return `${gap.count} ${copy.okr.gaps.unlinked}`;
    }
  });

  return (
    <section className={`${cardClass} grid gap-4`}>
      <div>
        <h3 className="font-semibold text-navy">{copy.okr.title}</h3>
        <p className="mt-1 text-sm text-textSecondary">{copy.okr.hint}</p>
      </div>

      {quarter.status === 'KPI_DRAFT' ? (
        gaps.length ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">{copy.okr.notReady}</p>
            <ul className="mt-1 list-disc pl-5">{gapText.map((text) => <li key={text}>{text}</li>)}</ul>
          </div>
        ) : <Badge tone="border-emerald-200 bg-emerald-50 text-emerald-800">{copy.okr.ready}</Badge>
      ) : null}

      {quarter.objectives.length ? quarter.objectives.map((objective, index) => {
        const keyResults = quarter.kpis.filter((kpi) => kpi.objectiveId === objective.id && !kpi.removedAt);
        const goalIndex = annualGoals.findIndex((goal) => goal.key === objective.annualGoalKey);
        return (
          <article key={objective.id} className="rounded-xl border border-slate-200 p-4">
            <h4 className="break-words font-semibold text-navy"><span className="text-royalBlue">O{index + 1}.</span> {objective.title}</h4>
            {goalIndex >= 0 ? <p className="mt-1 break-words text-xs text-slate-600"><span className="font-semibold">{copy.goals.servesGoal}: </span>G{goalIndex + 1}. {annualGoals[goalIndex].title}</p> : null}
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.okr.smart.specific}</dt><dd className="mt-1 whitespace-pre-line break-words">{objective.specific || '—'}</dd></div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.okr.smart.measurable}</dt>
                <dd className="mt-1">{keyResults.length ? <>{keyResults.length} {copy.okr.keyResults}<ul className="mt-1 list-disc pl-4 text-xs text-slate-600">{keyResults.map((kpi) => <li key={kpi.id} className="break-words">{kpi.name}</li>)}</ul></> : <span className="text-amber-700">{copy.okr.noKeyResults}</span>}</dd>
              </div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.okr.smart.achievable}</dt><dd className="mt-1 whitespace-pre-line break-words">{objective.achievable || '—'}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.okr.smart.relevant}</dt><dd className="mt-1 whitespace-pre-line break-words">{objective.relevant || '—'}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.okr.smart.timeBound}</dt><dd className="mt-1">{copy.okr.by} {deadline}</dd></div>
            </dl>
            {editable ? (
              <details className="mt-3 rounded-xl border border-slate-200 p-3">
                <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-royalBlue">{copy.okr.edit}</summary>
                <form action={updateObjectiveAction} className="mt-3 grid gap-3">
                  <Hidden planId={planId} quarter={quarter.quarter} objectiveId={objective.id} />
                  <ObjectiveFields copy={copy} values={objective} annualGoals={annualGoals} />
                  <button className={`${buttonClass} justify-self-start`}>{copy.okr.save}</button>
                </form>
                <form action={removeObjectiveAction} className="mt-4 grid gap-2 border-t border-slate-200 pt-3">
                  <Hidden planId={planId} quarter={quarter.quarter} objectiveId={objective.id} />
                  <p className="text-xs text-slate-600">{copy.okr.removeHint}</p>
                  <button className={`${dangerButtonClass} justify-self-start`}>{copy.okr.remove}</button>
                </form>
              </details>
            ) : null}
          </article>
        );
      }) : <p className="text-sm text-textSecondary">{copy.okr.none}</p>}

      {editable ? (
        <details className="rounded-xl border border-slate-200 p-3">
          <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-royalBlue">{copy.okr.add}</summary>
          <form action={addObjectiveAction} className="mt-3 grid gap-3">
            <Hidden planId={planId} quarter={quarter.quarter} />
            <ObjectiveFields copy={copy} annualGoals={annualGoals} />
            <button className={`${buttonClass} justify-self-start`}>{copy.okr.add}</button>
          </form>
        </details>
      ) : null}
    </section>
  );
}
