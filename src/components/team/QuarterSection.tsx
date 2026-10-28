import type { Route } from 'next';
import Link from 'next/link';
import {
  addKpiAction, addTemplateKpiAction, approveQuarterKpisAction, removeKpiAction, reopenResultsAction, returnQuarterKpisAction,
  reviewQuarterAction, submitQuarterKpisAction, submitResultsAction, updateKpiAction, updateProgressAction,
} from '@/app/team/actions';
import type { KpiComparator } from '@prisma/client';
import type { SupportedLocale } from '@/i18n/config';
import { type AnnualGoal, diffKpiSets, evaluateKpi, planEntryQuarter, formatActual, formatTarget, summarizeEvaluations, type CapabilityArea } from '@/server/ba-team/ba-plan-domain';
import {
  canAdjustQuarterKpis, canApproveQuarterKpis, canEditQuarterKpis, canReopenResults, canReviewQuarter, canSubmitQuarterKpis,
  canSubmitResults, canUpdateProgress, type BaTeamActor,
} from '@/server/ba-team/ba-plan-policy';
import type { BaPlanQuarterDetail } from '@/server/ba-team/ba-plan-repository';
import { ComparatorTargetFields } from './ComparatorTargetFields';
import { comparatorLabels, KpiFields, ObjectiveSelect, ReasonField } from './KpiFields';
import { KpiTableRow } from './KpiTableRow';
import { ObjectivesSection } from './ObjectivesSection';
import { Badge, buttonClass, cardClass, dangerButtonClass, inputClass, secondaryButtonClass } from './TeamShell';
import { capabilityAreaLabels, evaluationLabels, evaluationTone, quarterStatusLabels, type TeamCopy } from './team-copy';

/** Declaring a quarter's goals and reporting its results are separate views of the same quarter. */
export type QuarterView = 'declare' | 'report';

type Kpi = BaPlanQuarterDetail['kpis'][number];
type Props = {
  plan: { id: string; userId: string; year: number; status: 'DRAFT' | 'PENDING_APPROVAL' | 'CHANGES_REQUESTED' | 'APPROVED' | 'CLOSED' };
  quarter: BaPlanQuarterDetail;
  previous?: BaPlanQuarterDetail;
  annualGoals: AnnualGoal[];
  actor: BaTeamActor;
  templates: Array<{ id: string; name: string; comparator: KpiComparator; defaultTarget: number; unitLabel: string }>;
  copy: TeamCopy;
  locale: SupportedLocale;
  view: QuarterView;
  viewHrefs: Record<QuarterView, Route>;
};

function Hidden({ planId, quarter, view, kpiId, mode }: { planId: string; quarter: number; view: QuarterView; kpiId?: string; mode?: 'adjust' }) {
  return <><input type="hidden" name="planId" value={planId} /><input type="hidden" name="quarter" value={quarter} /><input type="hidden" name="view" value={view} />{kpiId ? <input type="hidden" name="kpiId" value={kpiId} /> : null}{mode ? <input type="hidden" name="mode" value={mode} /> : null}</>;
}

const dateFormat = (locale: SupportedLocale) => new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });

/** Results can be reported once the Lead has approved the quarter's KPI set. */
export function isReportOpen(status: BaPlanQuarterDetail['status']) {
  return status !== 'KPI_DRAFT' && status !== 'KPI_PENDING';
}

export function QuarterSection(props: Props) {
  const { quarter, copy, locale, view, viewHrefs } = props;
  const formatDate = dateFormat(locale);
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
        <nav aria-label={`${copy.quarter} ${quarter.quarter}`} className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:inline-grid">
          {(['declare', 'report'] as const).map((value) => (
            <Link key={value} href={viewHrefs[value]} aria-current={view === value ? 'page' : undefined} className={`flex min-h-11 items-center justify-center rounded-lg px-4 text-center text-sm font-semibold ${view === value ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-navy'}`}>
              {copy.quarterViews[value]}
            </Link>
          ))}
        </nav>
      </section>
      {view === 'declare'
        ? <DeclareView {...props} formatDate={formatDate} />
        : isReportOpen(quarter.status)
          ? <ReportView {...props} formatDate={formatDate} />
          : <p className={`${cardClass} text-sm text-textSecondary`}>{copy.reportNotOpen}</p>}
    </div>
  );
}

/** Objectives, KPIs and targets of the quarter, their approval, and the Lead's mid-quarter adjustments. */
function DeclareView({ plan, quarter, previous, annualGoals, actor, templates, copy, locale, formatDate }: Props & { formatDate: Intl.DateTimeFormat }) {
  const view: QuarterView = 'declare';
  const editDraft = canEditQuarterKpis(actor, plan, quarter);
  const adjust = canAdjustQuarterKpis(actor, plan, quarter);
  const kpis = quarter.kpis;
  const showDiff = previous && (quarter.status === 'KPI_DRAFT' || quarter.status === 'KPI_PENDING');
  const changes = showDiff ? diffKpiSets(previous.kpis, kpis).filter((change) => change.change !== 'UNCHANGED') : [];
  const entry = planEntryQuarter(plan.year);
  const isEntryWithPlan = quarter.quarter === entry && plan.status !== 'APPROVED' && plan.status !== 'CLOSED';
  const passedBeforePlan = quarter.quarter < entry && quarter.status === 'KPI_DRAFT' && plan.status !== 'APPROVED' && plan.status !== 'CLOSED';
  const submitKpis = canSubmitQuarterKpis(actor, plan, quarter);
  const approveKpis = canApproveQuarterKpis(actor, plan, quarter);
  const waitingForPlan = !isEntryWithPlan && !passedBeforePlan && quarter.status === 'KPI_DRAFT' && plan.status !== 'APPROVED' && plan.status !== 'CLOSED';

  const declareDetail = (kpi: Kpi) => {
    const removed = Boolean(kpi.removedAt);
    return (
      <div className="grid gap-3">
        <KpiDescription kpi={kpi} />
        {editDraft ? (
          <form action={updateKpiAction} className="grid gap-3">
            <Hidden planId={plan.id} quarter={quarter.quarter} view={view} kpiId={kpi.id} />
            <KpiFields copy={copy} locale={locale} values={kpi} objectives={quarter.objectives} />
            <button className={`${buttonClass} justify-self-start`}>{copy.updateKpi}</button>
          </form>
        ) : null}
        {adjust && !removed ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
            <p className="text-sm font-semibold text-amber-800">{copy.adjust}</p>
            <p className="mt-1 text-xs text-slate-600">{copy.adjustHint}</p>
            <form action={updateKpiAction} className="mt-3 grid gap-3">
              <Hidden planId={plan.id} quarter={quarter.quarter} view={view} kpiId={kpi.id} mode="adjust" />
              <KpiFields copy={copy} locale={locale} values={kpi} objectives={quarter.objectives} />
              <ReasonField copy={copy} />
              <button className={`${buttonClass} justify-self-start`}>{copy.updateKpi}</button>
            </form>
            <form action={removeKpiAction} className="mt-4 grid gap-3 border-t border-amber-200 pt-3">
              <Hidden planId={plan.id} quarter={quarter.quarter} view={view} kpiId={kpi.id} mode="adjust" />
              <ReasonField copy={copy} />
              <button className={`${dangerButtonClass} justify-self-start`}>{copy.removeKpi}</button>
            </form>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
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
                    <td className="py-2 pr-3">{change.previous ? formatTarget(change.previous.comparator, change.previous.targetValue, change.previous.unitLabel, locale) : '—'}</td>
                    <td className="py-2 pr-3">{change.current ? formatTarget(change.current.comparator, change.current.targetValue, change.current.unitLabel, locale) : '—'}</td>
                    <td className="py-2"><Badge>{copy.change[change.change]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <ObjectivesSection planId={plan.id} year={plan.year} quarter={quarter} annualGoals={annualGoals} editable={editDraft} copy={copy} locale={locale} />

      {kpis.length || editDraft ? <KpiTable mode="declare" objectives={quarter.objectives} kpis={kpis} copy={copy} locale={locale} formatDate={formatDate} planId={plan.id} quarter={quarter.quarter} editable={editDraft} templates={templates} detail={declareDetail} /> : null}
      {kpis.length ? null : <p className={`${cardClass} text-sm text-textSecondary`}>{copy.noKpis}</p>}

      {adjust ? (
        <section className={cardClass}>
          <h3 className="font-semibold text-navy">{copy.addKpi}</h3>
          {adjust ? <p className="mt-1 text-xs text-slate-600">{copy.adjustHint}</p> : null}
          {templates.length ? (
            <form action={addTemplateKpiAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Hidden planId={plan.id} quarter={quarter.quarter} view={view} mode={adjust ? 'adjust' : undefined} />
              <label className="block min-w-0 text-sm font-semibold">{copy.fromTemplate}
                <select name="templateId" required className={inputClass}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} ({formatTarget(template.comparator, template.defaultTarget, template.unitLabel, locale)})</option>)}</select>
              </label>
              <div className="sm:col-span-2"><ObjectiveSelect copy={copy} objectives={quarter.objectives} /></div>
              {adjust ? <div className="sm:col-span-2"><ReasonField copy={copy} /></div> : null}
              <button className={`${secondaryButtonClass} justify-self-start`}>{copy.addKpi}</button>
            </form>
          ) : null}
          <details className="mt-3 rounded-xl border border-slate-200 p-3">
            <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-royalBlue">{copy.custom}</summary>
            <form action={addKpiAction} className="mt-3 grid gap-3">
              <Hidden planId={plan.id} quarter={quarter.quarter} view={view} mode={adjust ? 'adjust' : undefined} />
              <KpiFields copy={copy} locale={locale} objectives={quarter.objectives} />
              {adjust ? <ReasonField copy={copy} /> : null}
              <button className={`${buttonClass} justify-self-start`}>{copy.addKpi}</button>
            </form>
          </details>
        </section>
      ) : null}

      {submitKpis || approveKpis || isEntryWithPlan || waitingForPlan || passedBeforePlan ? (
        <section className={`${cardClass} grid gap-4`}>
          {isEntryWithPlan && quarter.status === 'KPI_DRAFT' ? <p className="text-sm text-textSecondary">{copy.submitPlanHint}</p> : null}
          {passedBeforePlan ? <p className="text-sm text-textSecondary">{copy.quarterPassedHint}</p> : null}
          {waitingForPlan ? <p className="text-sm text-textSecondary">{copy.quarterWaitsForPlanHint}</p> : null}
          {submitKpis ? (
            <form action={submitQuarterKpisAction} className="grid gap-3">
              <Hidden planId={plan.id} quarter={quarter.quarter} view={view} />
              <label className="block min-w-0 text-sm font-semibold">{copy.changeNote}<textarea name="changeNote" maxLength={1000} rows={2} className={inputClass} /></label>
              <button className={`${buttonClass} justify-self-start`}>{copy.submitKpis}</button>
            </form>
          ) : null}
          {approveKpis ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <form action={approveQuarterKpisAction}><Hidden planId={plan.id} quarter={quarter.quarter} view={view} /><button className={buttonClass}>{copy.approveKpis}</button></form>
              <form action={returnQuarterKpisAction} className="grid gap-2"><Hidden planId={plan.id} quarter={quarter.quarter} view={view} /><ReasonField copy={copy} name="note" /><button className={`${secondaryButtonClass} justify-self-start`}>{copy.returnKpis}</button></form>
            </div>
          ) : null}
        </section>
      ) : null}

      {quarter.adjustments.length ? (
        <section className={cardClass}>
          <h3 className="font-semibold text-navy">{copy.adjustments}</h3>
          <ul className="mt-3 grid gap-2 text-sm">
            {quarter.adjustments.map((adjustment) => {
              const before = adjustment.beforeJson ? JSON.parse(adjustment.beforeJson) as { name: string; comparator: KpiComparator; targetValue: number; unitLabel: string } : null;
              const after = adjustment.afterJson ? JSON.parse(adjustment.afterJson) as { name: string; comparator: KpiComparator; targetValue: number; unitLabel: string } : null;
              return (
                <li key={adjustment.id} className="rounded-lg bg-slate-50 p-3">
                  <span className="font-semibold">{copy.change[adjustment.action] ?? adjustment.action}</span> · {(after ?? before)?.name}
                  {before && after ? <> · {formatTarget(before.comparator, before.targetValue, before.unitLabel, locale)} → {formatTarget(after.comparator, after.targetValue, after.unitLabel, locale)}</> : null}
                  <span className="block text-textSecondary">{adjustment.reason}</span>
                  <span className="block text-xs text-slate-500">{adjustment.actor.name} · {formatDate.format(adjustment.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/** Actual values, evidence and update logs against the approved targets, then submission and the Lead's review. */
function ReportView({ plan, quarter, actor, copy, locale, formatDate }: Props & { formatDate: Intl.DateTimeFormat }) {
  const view: QuarterView = 'report';
  const progress = canUpdateProgress(actor, plan, quarter);
  const review = canReviewQuarter(actor, plan, quarter);
  const submitResults = canSubmitResults(actor, plan, quarter);
  const reopen = canReopenResults(actor, plan, quarter);
  const kpis = quarter.kpis;

  const reportDetail = (kpi: Kpi) => {
    const removed = Boolean(kpi.removedAt);
    return (
      <div className="grid gap-3">
        <KpiDescription kpi={kpi} />
        {kpi.memberNote || kpi.evidenceUrl ? (
          <p className="break-words text-sm text-slate-700">
            {kpi.memberNote ? <><span className="font-semibold">{copy.memberNote}: </span>{kpi.memberNote} </> : null}
            {kpi.evidenceUrl ? <a href={kpi.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-royalBlue underline">{copy.evidence}</a> : null}
          </p>
        ) : null}
        {kpi.leadComment ? <p className="rounded-lg bg-white p-2 text-sm"><span className="font-semibold">{copy.leadComment}: </span>{kpi.leadComment}</p> : null}
        {progress && !removed ? (
          <form action={updateProgressAction} className="grid gap-3 sm:grid-cols-[160px_1fr_1fr_auto] sm:items-end">
            <Hidden planId={plan.id} quarter={quarter.quarter} view={view} kpiId={kpi.id} />
            <label className="block min-w-0 text-sm font-semibold">{copy.actual}
              {kpi.comparator === 'DONE'
                ? <select required name="actualValue" defaultValue={kpi.actualValue === null ? '' : String(kpi.actualValue >= 1 ? 1 : 0)} className={inputClass}><option value="" disabled>—</option><option value="1">{copy.milestone.done}</option><option value="0">{copy.milestone.notDone}</option></select>
                : <input required name="actualValue" type="number" step="any" defaultValue={kpi.actualValue ?? undefined} className={inputClass} />}
            </label>
            <label className="block min-w-0 text-sm font-semibold">{copy.memberNote}<input name="note" maxLength={1000} defaultValue={kpi.memberNote ?? ''} className={inputClass} /></label>
            <label className="block min-w-0 text-sm font-semibold">{copy.evidence}<input name="evidenceUrl" type="url" maxLength={500} placeholder="https://" defaultValue={kpi.evidenceUrl ?? ''} className={inputClass} /></label>
            <button className={buttonClass}>{copy.saveResult}</button>
          </form>
        ) : null}
        {kpi.progressLogs.length ? (
          <div>
            <p className="text-sm font-semibold text-slate-600">{copy.progressLog} ({kpi.progressLogs.length})</p>
            <ul className="mt-2 grid gap-2 text-sm">
              {kpi.progressLogs.map((log) => (
                <li key={log.id} className="rounded-lg bg-white p-2">
                  <span className="font-semibold">{formatActual(kpi.comparator, log.previousValue, '', locale)} → {formatActual(kpi.comparator, log.newValue, '', locale)}</span> · {log.author.name} · {formatDate.format(log.createdAt)}
                  {log.note ? <span className="block text-textSecondary">{log.note}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {kpis.length ? <KpiTable mode="report" objectives={quarter.objectives} kpis={kpis} copy={copy} locale={locale} formatDate={formatDate} planId={plan.id} quarter={quarter.quarter} editable={false} templates={[]} detail={reportDetail} /> : <p className={`${cardClass} text-sm text-textSecondary`}>{copy.noKpis}</p>}

      {submitResults || reopen ? (
        <section className={`${cardClass} grid gap-4`}>
          {submitResults ? (
            <form action={submitResultsAction} className="grid gap-2">
              <Hidden planId={plan.id} quarter={quarter.quarter} view={view} />
              <p className="text-sm text-textSecondary">{copy.submitResultsHint}</p>
              <button className={`${buttonClass} justify-self-start`}>{copy.submitResults}</button>
            </form>
          ) : null}
          {reopen ? (
            <form action={reopenResultsAction} className="grid gap-2">
              <Hidden planId={plan.id} quarter={quarter.quarter} view={view} />
              <ReasonField copy={copy} name="note" />
              <button className={`${secondaryButtonClass} justify-self-start`}>{copy.reopenResults}</button>
            </form>
          ) : null}
        </section>
      ) : null}

      {review ? (
        <section className={cardClass}>
          <h3 className="font-semibold text-navy">{copy.review}</h3>
          <form action={reviewQuarterAction} className="mt-3 grid gap-3">
            <Hidden planId={plan.id} quarter={quarter.quarter} view={view} />
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
    </>
  );
}

function KpiDescription({ kpi }: { kpi: Kpi }) {
  return kpi.description ? <p className="whitespace-pre-line break-words text-sm text-textSecondary">{kpi.description}</p> : null;
}

/**
 * KPIs grouped by Objective. Targets are shown read-only and change through each row's detail form, so the table
 * always reflects what is saved; the report view adds results against the approved targets. The row Remove buttons
 * join a form outside the table (via `form`) so it is not nested around the rows' own detail forms.
 */
function KpiTable({ mode, objectives, kpis, copy, locale, formatDate, planId, quarter, editable, templates, detail }: { mode: QuarterView; objectives: BaPlanQuarterDetail['objectives']; kpis: Kpi[]; copy: TeamCopy; locale: SupportedLocale; formatDate: Intl.DateTimeFormat; planId: string; quarter: number; editable: boolean; templates: Props['templates']; detail: (kpi: Kpi) => React.ReactNode }) {
  const report = mode === 'report';
  const summary = summarizeEvaluations(kpis);
  const linked = new Set(objectives.map((objective) => objective.id));
  const groups = [
    ...objectives.map((objective, index) => ({ key: objective.id, label: `O${index + 1}. ${objective.title}`, kpis: kpis.filter((kpi) => kpi.objectiveId === objective.id) })),
    { key: 'unlinked', label: copy.okr.unlinked, kpis: kpis.filter((kpi) => !kpi.objectiveId || !linked.has(kpi.objectiveId)) },
  ].filter((group) => group.kpis.length);
  const counts = [
    { label: copy.totalKpis, value: summary.total, tone: undefined },
    { label: evaluationLabels[locale].ACHIEVED, value: summary.achieved, tone: evaluationTone.ACHIEVED },
    { label: evaluationLabels[locale].NOT_ACHIEVED, value: summary.notAchieved, tone: evaluationTone.NOT_ACHIEVED },
    { label: evaluationLabels[locale].NOT_REPORTED, value: summary.notReported, tone: evaluationTone.NOT_REPORTED },
  ];
  const columns = report ? 8 : 4;
  const removeForm = `kpi-remove-q${quarter}`;
  const objectiveOptions = objectives.map((objective, index) => <option key={objective.id} value={objective.id}>O{index + 1}. {objective.title}</option>);

  const table = (
    <div className="mt-3 overflow-x-auto">
      <table className={`w-full text-left text-sm ${report ? 'min-w-[860px]' : 'min-w-[560px]'}`}>
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="w-8 py-2 pr-3">#</th>
            <th className="py-2 pr-3">{copy.kpi}</th>
            <th className="py-2 pr-3">{copy.target}</th>
            {report ? <>
              <th className="py-2 pr-3">{copy.actual}</th>
              <th className="py-2 pr-3">{copy.result}</th>
              <th className="py-2 pr-3">{copy.memberNote}</th>
              <th className="py-2 pr-3">{copy.lastUpdated}</th>
            </> : null}
            <th className="py-2"><span className="sr-only">{copy.openDetails}</span></th>
          </tr>
        </thead>
        <tbody>
          {groups.flatMap((group) => [
            <tr key={`group-${group.key}`} className="border-t border-slate-200 bg-slate-50">
              <td colSpan={columns} className="break-words px-2 py-2 font-semibold text-navy">{group.label}</td>
            </tr>,
            ...group.kpis.map((kpi) => row(kpi, kpis.indexOf(kpi))),
          ])}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-navy">{report ? copy.kpiTracking : copy.kpiTargets}</h3>
        {report ? <div className="flex flex-wrap gap-2">{counts.map((count) => <Badge key={count.label} tone={count.tone}>{count.label}: {count.value}</Badge>)}</div> : null}
      </div>
      {editable ? <form id={removeForm} action={removeKpiAction}><Hidden planId={planId} quarter={quarter} view="declare" /></form> : null}
      {kpis.length ? table : null}
      {editable ? (
        <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-slate-300 p-3">
          <h4 className="text-sm font-semibold text-navy">+ {copy.addKeyResult}</h4>
          <form action={addKpiAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_5rem_7rem_minmax(0,0.8fr)_auto] lg:items-end">
            <Hidden planId={planId} quarter={quarter} view="declare" />
            <label className="block min-w-0 text-sm font-semibold">{copy.okr.objective}<select name="objectiveId" defaultValue={objectives[0]?.id ?? ''} className={inputClass}><option value="">{copy.okr.unlinked}</option>{objectiveOptions}</select></label>
            <label className="block min-w-0 text-sm font-semibold">{copy.keyResultName}<input required name="name" minLength={2} maxLength={200} className={inputClass} /></label>
            <ComparatorTargetFields labels={comparatorLabels(copy, false)} />
            <button className={buttonClass}>{copy.addKeyResult}</button>
          </form>
          {templates.length ? (
            <form action={addTemplateKpiAction} className="grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end">
              <Hidden planId={planId} quarter={quarter} view="declare" />
              <label className="block min-w-0 text-sm font-semibold">{copy.okr.objective}<select name="objectiveId" defaultValue={objectives[0]?.id ?? ''} className={inputClass}><option value="">{copy.okr.unlinked}</option>{objectiveOptions}</select></label>
              <label className="block min-w-0 text-sm font-semibold">{copy.fromTemplate}<select name="templateId" required className={inputClass}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} ({formatTarget(template.comparator, template.defaultTarget, template.unitLabel, locale)})</option>)}</select></label>
              <button className={secondaryButtonClass}>{copy.addKeyResult}</button>
            </form>
          ) : null}
        </div>
      ) : null}
    </section>
  );

  function row(kpi: Kpi, index: number) {
    const removed = Boolean(kpi.removedAt);
    const evaluation = evaluateKpi(kpi.comparator, kpi.targetValue, kpi.actualValue);
    const lastLog = kpi.progressLogs[0];
    return (
      <KpiTableRow
        key={kpi.id}
        kpiId={kpi.id}
        columns={columns}
        removed={removed}
        label={copy.openDetails}
        detail={detail(kpi)}
        actions={editable && !removed ? <button form={removeForm} name="kpiId" value={kpi.id} aria-label={`${copy.removeKpi} · ${kpi.name}`} className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50">{copy.removeKpi}</button> : null}
      >
        <td className="py-3 pr-3 text-slate-500">{index + 1}</td>
        <td className="max-w-[280px] py-3 pr-3">
          <span className={`block break-words font-semibold ${removed ? 'line-through' : 'text-navy'}`}>{kpi.name}</span>
          {kpi.capabilityArea ? <span className="block text-xs text-slate-500">{capabilityAreaLabels[locale][kpi.capabilityArea as CapabilityArea] ?? kpi.capabilityArea}</span> : null}
        </td>
        <td className="whitespace-nowrap py-3 pr-3 font-semibold">{formatTarget(kpi.comparator, kpi.targetValue, kpi.unitLabel, locale)}</td>
        {report ? <>
          <td className="whitespace-nowrap py-3 pr-3 font-semibold">{formatActual(kpi.comparator, kpi.actualValue, kpi.unitLabel, locale)}</td>
          <td className="py-3 pr-3">{removed ? <Badge>{copy.removed}</Badge> : <Badge tone={evaluationTone[evaluation]}>{evaluationLabels[locale][evaluation]}</Badge>}</td>
          <td className="max-w-[240px] py-3 pr-3">
            {kpi.memberNote ? <span className="line-clamp-2 break-words">{kpi.memberNote}</span> : <span className="text-slate-400">—</span>}
            {kpi.evidenceUrl ? <a href={kpi.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-xs font-semibold text-royalBlue underline">{copy.evidence}</a> : null}
          </td>
          <td className="whitespace-nowrap py-3 pr-3 text-xs text-slate-500">{lastLog ? <>{formatDate.format(lastLog.createdAt)}<span className="block">{lastLog.author.name}</span></> : '—'}</td>
        </> : null}
      </KpiTableRow>
    );
  }
}
