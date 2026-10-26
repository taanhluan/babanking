import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Route } from 'next';
import { approvePlanAction, openNextQuarterAction, reopenPlanAction, returnPlanAction, submitPlanAction } from '@/app/team/actions';
import { AllocationSuggestion } from '@/components/team/AllocationSuggestion';
import { ReasonField } from '@/components/team/KpiFields';
import { ManagerNotesSection } from '@/components/team/ManagerNotesSection';
import { PlanHistorySection } from '@/components/team/PlanHistorySection';
import { PlanProfileSection } from '@/components/team/PlanProfileSection';
import { QuarterSection } from '@/components/team/QuarterSection';
import { Badge, ResultBanner, TeamNav, buttonClass, cardClass, secondaryButtonClass } from '@/components/team/TeamShell';
import { YearSummarySection } from '@/components/team/YearSummarySection';
import { planStatusLabels, quarterStatusLabels, teamCopy } from '@/components/team/team-copy';
import { WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { getCurrentLocale } from '@/i18n/server';
import { getLocalizedPath } from '@/i18n/routing';
import { parseManagerNotes, parsePlanProfile } from '@/server/ba-team/ba-plan-domain';
import {
  canApprovePlan, canCloseYear, isBaTeamLead, canEditPlanProfile, canOpenNextQuarter, canReopenPlan, canSubmitPlan, canWriteManagerNotes,
} from '@/server/ba-team/ba-plan-policy';
import { BaPlanRepository } from '@/server/ba-team/ba-plan-repository';
import { requirePlanAccess } from '@/server/ba-team/ba-team-access';

const tabs = ['plan', 'q1', 'q2', 'q3', 'q4', 'year', 'notes', 'history'] as const;
type Tab = (typeof tabs)[number];

export default async function PlanPage({ params, searchParams }: { params: Promise<{ planId: string }>; searchParams: Promise<{ tab?: string; error?: string; saved?: string }> }) {
  const { planId } = await params;
  const { actor } = await requirePlanAccess(planId);
  const [query, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const plan = await BaPlanRepository.getPlanDetail(planId);
  if (!plan) notFound();
  const copy = teamCopy[locale];
  const tab: Tab = tabs.find((value) => value === query.tab) ?? 'plan';
  const latest = plan.quarters.at(-1);
  const tabHref = (value: Tab) => getLocalizedPath(`/team/plans/${plan.id}?tab=${value}`, locale) as Route;
  const quarterNumber = tab.startsWith('q') ? Number(tab.slice(1)) : 0;
  const quarter = plan.quarters.find((entry) => entry.quarter === quarterNumber);
  const previous = plan.quarters.find((entry) => entry.quarter === quarterNumber - 1);
  const [templates, history] = await Promise.all([
    quarter ? BaPlanRepository.listTemplates({ activeOnly: true }) : Promise.resolve([]),
    tab === 'history' ? BaPlanRepository.listPlanHistory(plan.id) : Promise.resolve([]),
  ]);
  const hidden = <><input type="hidden" name="planId" value={plan.id} /><input type="hidden" name="tab" value={tab} /></>;

  return (
    <>
      <TeamNav active={plan.userId === actor.id ? 'plans' : 'overview'} isLead={isBaTeamLead(actor)} />
      <WorkspaceTitle eyebrow={copy.area} title={`${copy.plan} ${plan.year}`} description={`${copy.owner}: ${plan.user.name}`} />
      <ResultBanner error={query.error} saved={query.saved} savedLabel={copy.saved} />

      <section className={`${cardClass} mb-5 grid gap-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-600">{copy.status}:</span>
          <Badge tone="border-royalBlue/30 bg-blue-50 text-royalBlue">{planStatusLabels[locale][plan.status]}</Badge>
          {plan.approvedBy ? <span className="text-xs text-slate-500">{copy.approvePlan}: {plan.approvedBy.name}</span> : null}
        </div>
        {plan.status === 'CHANGES_REQUESTED' && plan.reviewNote ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><span className="font-semibold">{copy.returnNote}: </span>{plan.reviewNote}</p> : null}
        <div className="flex flex-wrap items-start gap-3">
          {canSubmitPlan(actor, plan) ? <form action={submitPlanAction}>{hidden}<button className={buttonClass}>{copy.submitPlan}</button></form> : null}
          {canApprovePlan(actor, plan) ? (
            <>
              <form action={approvePlanAction}>{hidden}<button className={buttonClass}>{copy.approvePlan}</button></form>
              <details className="min-w-[260px] flex-1 rounded-xl border border-slate-200 p-3">
                <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">{copy.returnPlan}</summary>
                <form action={returnPlanAction} className="mt-2 grid gap-2">{hidden}<ReasonField copy={copy} name="note" /><button className={`${secondaryButtonClass} justify-self-start`}>{copy.returnPlan}</button></form>
              </details>
            </>
          ) : null}
          {canReopenPlan(actor, plan) ? (
            <details className="min-w-[260px] flex-1 rounded-xl border border-slate-200 p-3">
              <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">{copy.reopenPlan}</summary>
              <p className="mt-2 text-xs text-slate-600">{copy.reopenHint}</p>
              <form action={reopenPlanAction} className="mt-2">{hidden}<button className={secondaryButtonClass}>{copy.reopenPlan}</button></form>
            </details>
          ) : null}
          {canOpenNextQuarter(actor, plan, latest) ? (
            <form action={openNextQuarterAction} className="grid gap-1">
              <input type="hidden" name="planId" value={plan.id} />
              <button className={secondaryButtonClass}>{copy.openNextQuarter} (Q{(latest?.quarter ?? 0) + 1})</button>
              <span className="text-xs text-slate-500">{copy.openNextQuarterHint}</span>
            </form>
          ) : null}
        </div>
      </section>

      <nav aria-label={copy.plan} className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
        {tabs.map((value) => {
          const quarterEntry = value.startsWith('q') ? plan.quarters.find((entry) => entry.quarter === Number(value.slice(1))) : undefined;
          const label = value.startsWith('q') ? `Q${value.slice(1)}` : copy.tabs[value as 'plan' | 'year' | 'notes' | 'history'];
          return (
            <Link key={value} href={tabHref(value)} aria-current={tab === value ? 'page' : undefined} className={`flex min-h-11 shrink-0 flex-col justify-center rounded-xl px-3 text-sm font-semibold ${tab === value ? 'bg-navy text-white' : 'text-slate-700 hover:bg-slate-50'}`}>
              {label}
              {value.startsWith('q') ? <span className={`text-[11px] font-normal ${tab === value ? 'text-slate-200' : 'text-slate-500'}`}>{quarterEntry ? quarterStatusLabels[locale][quarterEntry.status] : copy.notOpened}</span> : null}
            </Link>
          );
        })}
      </nav>

      {tab === 'plan' ? <AllocationSuggestion userId={plan.userId} locale={locale} /> : null}
      {tab === 'plan' ? <PlanProfileSection planId={plan.id} profile={parsePlanProfile(plan.profileJson)} editable={canEditPlanProfile(actor, plan)} copy={copy} locale={locale} /> : null}
      {quarterNumber ? (quarter
        ? <QuarterSection plan={plan} quarter={quarter} previous={previous} actor={actor} templates={templates} copy={copy} locale={locale} />
        : <p className={`${cardClass} text-sm text-textSecondary`}>{copy.notOpened}</p>) : null}
      {tab === 'year' ? <YearSummarySection plan={plan} canClose={canCloseYear(actor, plan, plan.quarters)} copy={copy} locale={locale} /> : null}
      {tab === 'notes' ? <ManagerNotesSection planId={plan.id} notes={parseManagerNotes(plan.managerNotesJson)} editable={canWriteManagerNotes(actor, plan)} copy={copy} /> : null}
      {tab === 'history' ? <PlanHistorySection entries={history} copy={copy} locale={locale} /> : null}
    </>
  );
}
