import { closeYearAction } from '@/app/team/actions';
import type { SupportedLocale } from '@/i18n/config';
import { evaluateKpi, formatNumber, formatTarget, parseAnnualOutcomes, quarters } from '@/server/ba-team/ba-plan-domain';
import type { BaPlanDetail } from '@/server/ba-team/ba-plan-repository';
import { Badge, buttonClass, cardClass, inputClass } from './TeamShell';
import { evaluationLabels, evaluationTone, type TeamCopy } from './team-copy';

type Kpi = BaPlanDetail['quarters'][number]['kpis'][number];

/** Builds one row per KPI lineage with that KPI's quarter-specific target and result. */
export function lineageRows(plan: BaPlanDetail) {
  const rows = new Map<string, { lineageKey: string; name: string; byQuarter: Partial<Record<number, Kpi>> }>();
  for (const quarter of plan.quarters) {
    for (const kpi of quarter.kpis) {
      if (kpi.removedAt) continue;
      const row = rows.get(kpi.lineageKey) ?? { lineageKey: kpi.lineageKey, name: kpi.name, byQuarter: {} };
      row.name = kpi.name;
      row.byQuarter[quarter.quarter] = kpi;
      rows.set(kpi.lineageKey, row);
    }
  }
  return [...rows.values()];
}

export function YearSummarySection({ plan, canClose, copy, locale }: { plan: BaPlanDetail; canClose: boolean; copy: TeamCopy; locale: SupportedLocale }) {
  const rows = lineageRows(plan);
  const outcomes = parseAnnualOutcomes(plan.annualOutcomesJson);
  const closed = plan.status === 'CLOSED';
  const table = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-xs uppercase text-slate-500">
          <tr><th className="py-2 pr-3">{copy.kpi}</th>{quarters.map((quarter) => <th key={quarter} className="py-2 pr-3">Q{quarter}</th>)}<th className="py-2">{copy.annualResult}</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.lineageKey} className="border-t border-slate-100 align-top">
              <td className="py-2 pr-3 font-semibold">{row.name}</td>
              {quarters.map((quarter) => {
                const kpi = row.byQuarter[quarter];
                if (!kpi) return <td key={quarter} className="py-2 pr-3 text-slate-400">—</td>;
                const evaluation = evaluateKpi(kpi.comparator, kpi.targetValue, kpi.actualValue);
                return (
                  <td key={quarter} className="py-2 pr-3">
                    <span className="block">{formatNumber(kpi.actualValue)} <span className="text-xs text-slate-500">/ {formatTarget(kpi.comparator, kpi.targetValue, kpi.unitLabel)}</span></span>
                    <span className={`mt-1 inline-block h-2 w-8 rounded-full border ${evaluationTone[evaluation]}`} role="img" aria-label={evaluationLabels[locale][evaluation]} title={evaluationLabels[locale][evaluation]} />
                  </td>
                );
              })}
              <td className="py-2">
                {canClose ? (
                  <div className="grid gap-1">
                    <select name={`outcome.${row.lineageKey}`} required defaultValue="" form="close-year" className={inputClass}><option value="" disabled>—</option><option value="ACHIEVED">{copy.outcome.ACHIEVED}</option><option value="NOT_ACHIEVED">{copy.outcome.NOT_ACHIEVED}</option></select>
                    <input name={`outcomeComment.${row.lineageKey}`} maxLength={500} form="close-year" placeholder={copy.memberNote} className={inputClass} />
                  </div>
                ) : outcomes[row.lineageKey] ? (
                  <><Badge tone={outcomes[row.lineageKey].outcome === 'ACHIEVED' ? evaluationTone.ACHIEVED : evaluationTone.NOT_ACHIEVED}>{copy.outcome[outcomes[row.lineageKey].outcome]}</Badge>{outcomes[row.lineageKey].comment ? <span className="mt-1 block text-xs text-textSecondary">{outcomes[row.lineageKey].comment}</span> : null}</>
                ) : <span className="text-slate-400">—</span>}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-200">
            <td className="py-2 pr-3 font-semibold">{copy.quarterRating}</td>
            {quarters.map((quarter) => <td key={quarter} className="py-2 pr-3 font-semibold">{plan.quarters.find((entry) => entry.quarter === quarter)?.reviewRating ?? '—'}</td>)}
            <td className="py-2 font-semibold">{closed && plan.annualRating ? `${plan.annualRating}/5` : ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
  return (
    <div className="grid gap-4">
      <section className={cardClass}>{table}</section>
      {closed ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-navy">{copy.annualReview}</h2>
          <p className="mt-2 text-2xl font-semibold text-navy">{plan.annualRating}/5</p>
          <p className="mt-2 whitespace-pre-line text-sm">{plan.annualAssessment}</p>
          <p className="mt-2 text-xs text-slate-500">{plan.annualReviewedBy?.name}{plan.annualReviewedAt ? ` · ${plan.annualReviewedAt.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-GB')}` : ''}</p>
        </section>
      ) : canClose ? (
        <form id="close-year" action={closeYearAction} className={`${cardClass} grid gap-3`}>
          <input type="hidden" name="planId" value={plan.id} />
          <input type="hidden" name="tab" value="year" />
          <h2 className="text-lg font-semibold text-navy">{copy.annualReview}</h2>
          <label className="block min-w-0 text-sm font-semibold sm:w-48">{copy.annualRating}<select name="rating" required defaultValue="" className={inputClass}><option value="" disabled>—</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="block min-w-0 text-sm font-semibold">{copy.assessment}<textarea name="assessment" required minLength={10} maxLength={1000} rows={3} className={inputClass} /></label>
          <button className={`${buttonClass} justify-self-start`}>{copy.closeYear}</button>
        </form>
      ) : <p className="text-sm text-textSecondary">{copy.closeYearHint}</p>}
    </div>
  );
}
