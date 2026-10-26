import {
  addKpiAction, addTemplateKpiAction, approveQuarterKpisAction, removeKpiAction, reopenResultsAction, returnQuarterKpisAction,
  reviewQuarterAction, submitQuarterKpisAction, submitResultsAction, updateKpiAction, updateProgressAction,
} from '@/app/team/actions';
import type { SupportedLocale } from '@/i18n/config';
import { diffKpiSets, evaluateKpi, formatNumber, formatTarget, type CapabilityArea } from '@/server/ba-team/ba-plan-domain';
import {
  canAdjustQuarterKpis, canApproveQuarterKpis, canEditQuarterKpis, canReopenResults, canReviewQuarter, canSubmitQuarterKpis,
  canSubmitResults, canUpdateProgress, type BaTeamActor,
} from '@/server/ba-team/ba-plan-policy';
import type { BaPlanQuarterDetail } from '@/server/ba-team/ba-plan-repository';
import { KpiFields, ReasonField } from './KpiFields';
import { Badge, buttonClass, cardClass, dangerButtonClass, inputClass, secondaryButtonClass } from './TeamShell';
import { capabilityAreaLabels, evaluationLabels, evaluationTone, quarterStatusLabels, type TeamCopy } from './team-copy';

type Props = {
  plan: { id: string; userId: string; status: 'DRAFT' | 'PENDING_APPROVAL' | 'CHANGES_REQUESTED' | 'APPROVED' | 'CLOSED' };
  quarter: BaPlanQuarterDetail;
  previous?: BaPlanQuarterDetail;
  actor: BaTeamActor;
  templates: Array<{ id: string; name: string; comparator: 'GTE' | 'LTE'; defaultTarget: number; unitLabel: string }>;
  copy: TeamCopy;
  locale: SupportedLocale;
};

function Hidden({ planId, quarter, kpiId, mode }: { planId: string; quarter: number; kpiId?: string; mode?: 'adjust' }) {
  return <><input type="hidden" name="planId" value={planId} /><input type="hidden" name="quarter" value={quarter} />{kpiId ? <input type="hidden" name="kpiId" value={kpiId} /> : null}{mode ? <input type="hidden" name="mode" value={mode} /> : null}</>;
}

const dateFormat = (locale: SupportedLocale) => new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export function QuarterSection({ plan, quarter, previous, actor, templates, copy, locale }: Props) {
  const editDraft = canEditQuarterKpis(actor, plan, quarter);
  const adjust = canAdjustQuarterKpis(actor, plan, quarter);
  const progress = canUpdateProgress(actor, plan, quarter);
  const review = canReviewQuarter(actor, plan, quarter);
  const formatDate = dateFormat(locale);
  const kpis = quarter.kpis;
  const showDiff = previous && (quarter.status === 'KPI_DRAFT' || quarter.status === 'KPI_PENDING');
  const changes = showDiff ? diffKpiSets(previous.kpis, kpis).filter((change) => change.change !== 'UNCHANGED') : [];
  const isQ1WithPlan = quarter.quarter === 1 && plan.status !== 'APPROVED' && plan.status !== 'CLOSED';

  return (
    <div className="grid gap-4">
      <section className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-navy">{copy.quarter} {quarter.quarter}</h2>
          <Badge>{quarterStatusLabels[locale][quarter.status]}</Badge>
        </div>
        {quarter.returnNote ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><span className="font-semibold">{copy.returnNote}: </span>{quarter.returnNote}</p> : null}
        {quarter.changeNote ? <p className="mt-3 text-sm text-textSecondary"><span className="font-semibold">{copy.changeNote}: </span>{quarter.changeNote}</p> : null}
        {quarter.kpiApprovedBy ? <p className="mt-2 text-xs text-slate-500">{copy.approveKpis}: {quarter.kpiApprovedBy.name}{quarter.kpiApprovedAt ? ` · ${formatDate.format(quarter.kpiApprovedAt)}` : ''}</p> : null}
      </section>

      {changes.length ? (
        <section className={cardClass}>
          <h3 className="font-semibold text-navy">{copy.changesVsPrevious}</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2 pr-3">{copy.kpi}</th><th className="py-2 pr-3">{copy.previousTarget}</th><th className="py-2 pr-3">{copy.currentTarget}</th><th className="py-2">&nbsp;</th></tr></thead>
              <tbody>
                {changes.map((change) => (
                  <tr key={change.lineageKey} className="border-t border-slate-100">
                    <td className="py-2 pr-3 font-semibold">{change.name}</td>
                    <td className="py-2 pr-3">{change.previous ? formatTarget(change.previous.comparator, change.previous.targetValue, change.previous.unitLabel) : '—'}</td>
                    <td className="py-2 pr-3">{change.current ? formatTarget(change.current.comparator, change.current.targetValue, change.current.unitLabel) : '—'}</td>
                    <td className="py-2"><Badge>{copy.change[change.change]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3">
        {kpis.length ? kpis.map((kpi) => {
          const evaluation = evaluateKpi(kpi.comparator, kpi.targetValue, kpi.actualValue);
          const removed = Boolean(kpi.removedAt);
          return (
            <article key={kpi.id} className={`${cardClass} ${removed ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className={`break-words font-semibold text-navy ${removed ? 'line-through' : ''}`}>{kpi.name}</h3>
                  {kpi.capabilityArea ? <p className="text-xs text-slate-500">{capabilityAreaLabels[locale][kpi.capabilityArea as CapabilityArea] ?? kpi.capabilityArea}</p> : null}
                  {kpi.description ? <p className="mt-1 text-sm text-textSecondary">{kpi.description}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{copy.target}: {formatTarget(kpi.comparator, kpi.targetValue, kpi.unitLabel)}</Badge>
                  <Badge>{copy.actual}: {formatNumber(kpi.actualValue)}</Badge>
                  {removed ? <Badge>{copy.removed}</Badge> : <Badge tone={evaluationTone[evaluation]}>{evaluationLabels[locale][evaluation]}</Badge>}
                </div>
              </div>
              {kpi.memberNote || kpi.evidenceUrl ? (
                <p className="mt-3 break-words text-sm text-slate-700">
                  {kpi.memberNote ? <><span className="font-semibold">{copy.memberNote}: </span>{kpi.memberNote} </> : null}
                  {kpi.evidenceUrl ? <a href={kpi.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-royalBlue underline">{copy.evidence}</a> : null}
                </p>
              ) : null}
              {kpi.leadComment ? <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm"><span className="font-semibold">{copy.leadComment}: </span>{kpi.leadComment}</p> : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {progress && !removed ? (
                  <details className="w-full rounded-xl border border-slate-200 p-3">
                    <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-royalBlue">{copy.updateResult}</summary>
                    <form action={updateProgressAction} className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr_1fr_auto] sm:items-end">
                      <Hidden planId={plan.id} quarter={quarter.quarter} kpiId={kpi.id} />
                      <label className="block min-w-0 text-sm font-semibold">{copy.actual}<input required name="actualValue" type="number" step="any" defaultValue={kpi.actualValue ?? undefined} className={inputClass} /></label>
                      <label className="block min-w-0 text-sm font-semibold">{copy.memberNote}<input name="note" maxLength={1000} defaultValue={kpi.memberNote ?? ''} className={inputClass} /></label>
                      <label className="block min-w-0 text-sm font-semibold">{copy.evidence}<input name="evidenceUrl" type="url" maxLength={500} placeholder="https://" defaultValue={kpi.evidenceUrl ?? ''} className={inputClass} /></label>
                      <button className={buttonClass}>{copy.saveResult}</button>
                    </form>
                  </details>
                ) : null}
                {editDraft ? (
                  <details className="w-full rounded-xl border border-slate-200 p-3">
                    <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-royalBlue">{copy.edit}</summary>
                    <form action={updateKpiAction} className="mt-3 grid gap-3">
                      <Hidden planId={plan.id} quarter={quarter.quarter} kpiId={kpi.id} />
                      <KpiFields copy={copy} locale={locale} values={kpi} />
                      <button className={`${buttonClass} justify-self-start`}>{copy.updateKpi}</button>
                    </form>
                    <form action={removeKpiAction} className="mt-3">
                      <Hidden planId={plan.id} quarter={quarter.quarter} kpiId={kpi.id} />
                      <button className={dangerButtonClass}>{copy.removeKpi}</button>
                    </form>
                  </details>
                ) : null}
                {adjust && !removed ? (
                  <details className="w-full rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                    <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-amber-800">{copy.adjust}</summary>
                    <p className="mt-2 text-xs text-slate-600">{copy.adjustHint}</p>
                    <form action={updateKpiAction} className="mt-3 grid gap-3">
                      <Hidden planId={plan.id} quarter={quarter.quarter} kpiId={kpi.id} mode="adjust" />
                      <KpiFields copy={copy} locale={locale} values={kpi} />
                      <ReasonField copy={copy} />
                      <button className={`${buttonClass} justify-self-start`}>{copy.updateKpi}</button>
                    </form>
                    <form action={removeKpiAction} className="mt-4 grid gap-3 border-t border-amber-200 pt-3">
                      <Hidden planId={plan.id} quarter={quarter.quarter} kpiId={kpi.id} mode="adjust" />
                      <ReasonField copy={copy} />
                      <button className={`${dangerButtonClass} justify-self-start`}>{copy.removeKpi}</button>
                    </form>
                  </details>
                ) : null}
                {kpi.progressLogs.length ? (
                  <details className="w-full rounded-xl border border-slate-100 p-3">
                    <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-slate-600">{copy.progressLog} ({kpi.progressLogs.length})</summary>
                    <ul className="mt-2 grid gap-2 text-sm">
                      {kpi.progressLogs.map((log) => (
                        <li key={log.id} className="rounded-lg bg-slate-50 p-2">
                          <span className="font-semibold">{formatNumber(log.previousValue)} → {formatNumber(log.newValue)}</span> · {log.author.name} · {formatDate.format(log.createdAt)}
                          {log.note ? <span className="block text-textSecondary">{log.note}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            </article>
          );
        }) : <p className={`${cardClass} text-sm text-textSecondary`}>{copy.noKpis}</p>}
      </section>

      {editDraft || adjust ? (
        <section className={cardClass}>
          <h3 className="font-semibold text-navy">{copy.addKpi}</h3>
          {adjust ? <p className="mt-1 text-xs text-slate-600">{copy.adjustHint}</p> : null}
          {templates.length ? (
            <form action={addTemplateKpiAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Hidden planId={plan.id} quarter={quarter.quarter} mode={adjust ? 'adjust' : undefined} />
              <label className="block min-w-0 text-sm font-semibold">{copy.fromTemplate}
                <select name="templateId" required className={inputClass}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} ({formatTarget(template.comparator, template.defaultTarget, template.unitLabel)})</option>)}</select>
              </label>
              {adjust ? <div className="sm:col-span-2"><ReasonField copy={copy} /></div> : null}
              <button className={`${secondaryButtonClass} justify-self-start`}>{copy.addKpi}</button>
            </form>
          ) : null}
          <details className="mt-3 rounded-xl border border-slate-200 p-3">
            <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-royalBlue">{copy.custom}</summary>
            <form action={addKpiAction} className="mt-3 grid gap-3">
              <Hidden planId={plan.id} quarter={quarter.quarter} mode={adjust ? 'adjust' : undefined} />
              <KpiFields copy={copy} locale={locale} />
              {adjust ? <ReasonField copy={copy} /> : null}
              <button className={`${buttonClass} justify-self-start`}>{copy.addKpi}</button>
            </form>
          </details>
        </section>
      ) : null}

      <QuarterActions plan={plan} quarter={quarter} actor={actor} copy={copy} isQ1WithPlan={isQ1WithPlan} />

      {review ? (
        <section className={cardClass}>
          <h3 className="font-semibold text-navy">{copy.review}</h3>
          <form action={reviewQuarterAction} className="mt-3 grid gap-3">
            <Hidden planId={plan.id} quarter={quarter.quarter} />
            <label className="block min-w-0 text-sm font-semibold sm:w-48">{copy.rating}<select name="rating" required defaultValue="" className={inputClass}><option value="" disabled>—</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label className="block min-w-0 text-sm font-semibold">{copy.assessment}<textarea name="assessment" required minLength={10} maxLength={1000} rows={3} className={inputClass} /></label>
            {kpis.filter((kpi) => !kpi.removedAt).map((kpi) => (
              <label key={kpi.id} className="block min-w-0 text-sm font-semibold">{copy.leadComment} · {kpi.name}<input name={`comment.${kpi.id}`} maxLength={1000} defaultValue={kpi.leadComment ?? ''} className={inputClass} /></label>
            ))}
            <button className={`${buttonClass} justify-self-start`}>{copy.saveReview}</button>
          </form>
        </section>
      ) : quarter.status === 'REVIEWED' ? (
        <section className={cardClass}>
          <h3 className="font-semibold text-navy">{copy.review}</h3>
          <p className="mt-2 text-2xl font-semibold text-navy">{quarter.reviewRating}/5</p>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-800">{quarter.reviewAssessment}</p>
          <p className="mt-2 text-xs text-slate-500">{quarter.reviewedBy?.name}{quarter.reviewedAt ? ` · ${formatDate.format(quarter.reviewedAt)}` : ''}</p>
        </section>
      ) : null}

      {quarter.adjustments.length ? (
        <section className={cardClass}>
          <h3 className="font-semibold text-navy">{copy.adjustments}</h3>
          <ul className="mt-3 grid gap-2 text-sm">
            {quarter.adjustments.map((adjustment) => {
              const before = adjustment.beforeJson ? JSON.parse(adjustment.beforeJson) as { name: string; comparator: 'GTE' | 'LTE'; targetValue: number; unitLabel: string } : null;
              const after = adjustment.afterJson ? JSON.parse(adjustment.afterJson) as { name: string; comparator: 'GTE' | 'LTE'; targetValue: number; unitLabel: string } : null;
              return (
                <li key={adjustment.id} className="rounded-lg bg-slate-50 p-3">
                  <span className="font-semibold">{copy.change[adjustment.action] ?? adjustment.action}</span> · {(after ?? before)?.name}
                  {before && after ? <> · {formatTarget(before.comparator, before.targetValue, before.unitLabel)} → {formatTarget(after.comparator, after.targetValue, after.unitLabel)}</> : null}
                  <span className="block text-textSecondary">{adjustment.reason}</span>
                  <span className="block text-xs text-slate-500">{adjustment.actor.name} · {formatDate.format(adjustment.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function QuarterActions({ plan, quarter, actor, copy, isQ1WithPlan }: { plan: Props['plan']; quarter: BaPlanQuarterDetail; actor: BaTeamActor; copy: TeamCopy; isQ1WithPlan: boolean }) {
  const submitKpis = canSubmitQuarterKpis(actor, plan, quarter);
  const approveKpis = canApproveQuarterKpis(actor, plan, quarter);
  const submitResults = canSubmitResults(actor, plan, quarter);
  const reopen = canReopenResults(actor, plan, quarter);
  if (!submitKpis && !approveKpis && !submitResults && !reopen && !isQ1WithPlan) return null;
  return (
    <section className={`${cardClass} grid gap-4`}>
      {isQ1WithPlan && quarter.status === 'KPI_DRAFT' ? <p className="text-sm text-textSecondary">{copy.submitPlanHint}</p> : null}
      {submitKpis ? (
        <form action={submitQuarterKpisAction} className="grid gap-3">
          <Hidden planId={plan.id} quarter={quarter.quarter} />
          <label className="block min-w-0 text-sm font-semibold">{copy.changeNote}<textarea name="changeNote" maxLength={1000} rows={2} className={inputClass} /></label>
          <button className={`${buttonClass} justify-self-start`}>{copy.submitKpis}</button>
        </form>
      ) : null}
      {approveKpis ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <form action={approveQuarterKpisAction}><Hidden planId={plan.id} quarter={quarter.quarter} /><button className={buttonClass}>{copy.approveKpis}</button></form>
          <form action={returnQuarterKpisAction} className="grid gap-2"><Hidden planId={plan.id} quarter={quarter.quarter} /><ReasonField copy={copy} name="note" /><button className={`${secondaryButtonClass} justify-self-start`}>{copy.returnKpis}</button></form>
        </div>
      ) : null}
      {submitResults ? (
        <form action={submitResultsAction} className="grid gap-2">
          <Hidden planId={plan.id} quarter={quarter.quarter} />
          <p className="text-sm text-textSecondary">{copy.submitResultsHint}</p>
          <button className={`${buttonClass} justify-self-start`}>{copy.submitResults}</button>
        </form>
      ) : null}
      {reopen ? (
        <form action={reopenResultsAction} className="grid gap-2">
          <Hidden planId={plan.id} quarter={quarter.quarter} />
          <ReasonField copy={copy} name="note" />
          <button className={`${secondaryButtonClass} justify-self-start`}>{copy.reopenResults}</button>
        </form>
      ) : null}
    </section>
  );
}
