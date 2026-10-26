import Link from 'next/link';
import type { Route } from 'next';
import { Badge, ResultBanner, TeamNav, buttonClass, cardClass, inputClass } from '@/components/team/TeamShell';
import { capabilityAreaLabels, planStatusLabels, quarterStatusLabels, teamCopy } from '@/components/team/team-copy';
import { EmptyState, WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { getCurrentLocale } from '@/i18n/server';
import { getLocalizedPath } from '@/i18n/routing';
import type { CapabilityArea } from '@/server/ba-team/ba-plan-domain';
import { formatTarget } from '@/server/ba-team/ba-plan-domain';
import { isBaTeamLead } from '@/server/ba-team/ba-plan-policy';
import { BaPlanRepository } from '@/server/ba-team/ba-plan-repository';
import { requireBaTeamMember } from '@/server/ba-team/ba-team-access';
import { createPlanAction } from './actions';

export default async function TeamPlansPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const actor = await requireBaTeamMember('/team');
  const [params, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const copy = teamCopy[locale];
  const [plans, templates] = await Promise.all([BaPlanRepository.listPlansForUser(actor.id), BaPlanRepository.listTemplates({ activeOnly: true })]);
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1].filter((year) => !plans.some((plan) => plan.year === year));
  return (
    <>
      <TeamNav active="plans" isLead={isBaTeamLead(actor)} />
      <WorkspaceTitle eyebrow={copy.area} title={copy.title} description={copy.description} />
      <ResultBanner error={params.error} saved={params.saved} savedLabel={copy.saved} />
      {plans.length ? (
        <div className="mb-8 grid gap-3">
          {plans.map((plan) => (
            <Link key={plan.id} href={getLocalizedPath(`/team/plans/${plan.id}`, locale) as Route} className={`${cardClass} flex flex-wrap items-center justify-between gap-3 hover:border-royalBlue`}>
              <div>
                <p className="text-lg font-semibold text-navy">{copy.plan} {plan.year}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {plan.quarters.map((quarter) => <Badge key={quarter.quarter}>Q{quarter.quarter} · {quarterStatusLabels[locale][quarter.status]}</Badge>)}
                </div>
              </div>
              <Badge tone="border-royalBlue/30 bg-blue-50 text-royalBlue">{planStatusLabels[locale][plan.status]}</Badge>
            </Link>
          ))}
        </div>
      ) : <div className="mb-8"><EmptyState title={copy.noPlans} description={copy.noPlansHint} /></div>}
      {years.length ? (
        <section className={cardClass}>
          <h2 className="text-xl font-semibold text-navy">{copy.createPlan}</h2>
          <form action={createPlanAction} className="mt-4 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block min-w-0 text-sm font-semibold">{copy.year}<select name="year" defaultValue={years.includes(currentYear) ? currentYear : years[0]} className={inputClass}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
              <label className="block min-w-0 text-sm font-semibold">{copy.source}<select name="source" defaultValue="TEMPLATES" className={inputClass}><option value="TEMPLATES">{copy.sourceTemplates}</option><option value="PREVIOUS_YEAR">{copy.sourcePrevious}</option><option value="BLANK">{copy.sourceBlank}</option></select></label>
            </div>
            {templates.length ? (
              <fieldset className="rounded-xl border border-slate-200 p-3">
                <legend className="px-1 text-sm font-semibold">{copy.chooseTemplates}</legend>
                <div className="grid gap-2 md:grid-cols-2">
                  {templates.map((template) => (
                    <label key={template.id} className="flex min-h-11 items-start gap-2 rounded-lg p-2 text-sm hover:bg-slate-50">
                      <input type="checkbox" name="templateIds" value={template.id} defaultChecked className="mt-1 h-4 w-4" />
                      <span><span className="font-semibold">{template.name}</span> <span className="text-textSecondary">{formatTarget(template.comparator, template.defaultTarget, template.unitLabel)}</span><br /><span className="text-xs text-slate-500">{capabilityAreaLabels[locale][template.capabilityArea as CapabilityArea] ?? template.capabilityArea}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <button className={`${buttonClass} justify-self-start`}>{copy.create}</button>
          </form>
        </section>
      ) : null}
    </>
  );
}
