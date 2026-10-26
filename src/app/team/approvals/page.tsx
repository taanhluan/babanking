import Link from 'next/link';
import type { Route } from 'next';
import { TeamNav, cardClass } from '@/components/team/TeamShell';
import { teamCopy } from '@/components/team/team-copy';
import { WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { getCurrentLocale } from '@/i18n/server';
import { getLocalizedPath } from '@/i18n/routing';
import { BaPlanRepository } from '@/server/ba-team/ba-plan-repository';
import { requireBaTeamLead } from '@/server/ba-team/ba-team-access';

export default async function TeamApprovalsPage() {
  await requireBaTeamLead('/team/approvals');
  const locale = await getCurrentLocale();
  const copy = teamCopy[locale];
  const pending = await BaPlanRepository.pendingForLead();
  const format = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium' });
  const href = (planId: string, tab: string) => getLocalizedPath(`/team/plans/${planId}?tab=${tab}`, locale) as Route;
  const groups = [
    { title: copy.pendingPlans, items: pending.plans.map((plan) => ({ key: plan.id, label: `${plan.user.name} · ${copy.plan} ${plan.year}`, date: plan.submittedAt, href: href(plan.id, 'plan') })) },
    { title: copy.pendingKpiSets, items: pending.kpiSets.map((entry) => ({ key: `${entry.plan.id}-${entry.quarter}`, label: `${entry.plan.user.name} · ${entry.plan.year} Q${entry.quarter}`, date: entry.kpiSubmittedAt, href: href(entry.plan.id, `q${entry.quarter}`) })) },
    { title: copy.pendingResults, items: pending.results.map((entry) => ({ key: `${entry.plan.id}-${entry.quarter}`, label: `${entry.plan.user.name} · ${entry.plan.year} Q${entry.quarter}`, date: entry.resultsSubmittedAt, href: href(entry.plan.id, `q${entry.quarter}`) })) },
  ];
  return (
    <>
      <TeamNav active="approvals" isLead />
      <WorkspaceTitle eyebrow={copy.area} title={copy.approvalsTitle} description={copy.approvalsDescription} />
      <div className="grid gap-4">
        {groups.map((group) => (
          <section key={group.title} className={cardClass}>
            <h2 className="text-lg font-semibold text-navy">{group.title} ({group.items.length})</h2>
            {group.items.length ? (
              <ul className="mt-3 grid gap-2">
                {group.items.map((item) => <li key={item.key}><Link href={item.href} className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:border-royalBlue"><span className="font-semibold">{item.label}</span><span className="text-xs text-slate-500">{item.date ? format.format(item.date) : ''}</span></Link></li>)}
              </ul>
            ) : <p className="mt-2 text-sm text-textSecondary">{copy.nothingPending}</p>}
          </section>
        ))}
      </div>
    </>
  );
}
