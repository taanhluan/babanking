import Link from 'next/link';
import type { Route } from 'next';
import { Badge, TeamNav, cardClass, inputClass, secondaryButtonClass } from '@/components/team/TeamShell';
import { levelLabels } from '@/components/team/allocation-copy';
import { planStatusLabels, quarterStatusLabels, teamCopy } from '@/components/team/team-copy';
import { WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import type { SupportedLocale } from '@/i18n/config';
import { getCurrentLocale } from '@/i18n/server';
import { getLocalizedPath } from '@/i18n/routing';
import { parseManagerNotes, parsePlanProfile, planYearSchema, quarters } from '@/server/ba-team/ba-plan-domain';
import { BaPlanRepository } from '@/server/ba-team/ba-plan-repository';
import { requireBaTeamLead } from '@/server/ba-team/ba-team-access';

const isLevel = (value: string): value is keyof (typeof levelLabels)['en'] => value in levelLabels.en;
/** Plans store the chosen team level; plans written before the level list keep their free text. */
const planLevel = (locale: SupportedLocale, level: string) => (isLevel(level) ? levelLabels[locale][level] : level) || '—';

export default async function TeamOverviewPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requireBaTeamLead('/team/overview');
  const [params, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const copy = teamCopy[locale];
  const currentYear = new Date().getFullYear();
  const parsedYear = planYearSchema.safeParse(params.year);
  const year = parsedYear.success ? parsedYear.data : currentYear;
  const members = await BaPlanRepository.teamOverview(year);
  return (
    <>
      <TeamNav active="overview" isLead />
      <WorkspaceTitle eyebrow={copy.area} title={copy.overviewTitle} description={copy.overviewDescription} />
      <form className="mb-5 flex flex-wrap items-end gap-3">
        <label className="block w-full min-w-0 text-sm font-semibold sm:w-48">{copy.year}<select name="year" defaultValue={year} className={inputClass}>{[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <button className={secondaryButtonClass}>OK</button>
      </form>
      <div className={`${cardClass} overflow-x-auto`}>
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr><th className="py-2 pr-3">{copy.owner}</th><th className="py-2 pr-3">{copy.fields.level}</th><th className="py-2 pr-3">{copy.plan}</th>{quarters.map((quarter) => <th key={quarter} className="py-2 pr-3">Q{quarter}</th>)}<th className="py-2">{copy.promotionReadiness}</th></tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const plan = member.plan;
              return (
                <tr key={member.id} className="border-t border-slate-100 align-top">
                  <td className="py-3 pr-3"><span className="font-semibold">{member.name}</span><span className="block text-xs text-slate-500">{member.email}</span></td>
                  <td className="py-3 pr-3">{member.baTeamProfile?.level ? levelLabels[locale][member.baTeamProfile.level] : (plan ? planLevel(locale, parsePlanProfile(plan.profileJson).personal.level) : '—')}</td>
                  <td className="py-3 pr-3">{plan ? <Link href={getLocalizedPath(`/team/plans/${plan.id}`, locale) as Route} className="font-semibold text-royalBlue underline">{planStatusLabels[locale][plan.status]}</Link> : <span className="text-slate-400">{copy.noPlan}</span>}</td>
                  {quarters.map((quarter) => {
                    const entry = plan?.quarters.find((item) => item.quarter === quarter);
                    if (!entry) return <td key={quarter} className="py-3 pr-3 text-slate-400">—</td>;
                    const reported = entry.summary.achieved + entry.summary.notAchieved;
                    return (
                      <td key={quarter} className="py-3 pr-3">
                        <span className="block font-semibold">{reported ? `${entry.summary.achieved}/${entry.summary.total} ${copy.achievedOf}` : '—'}</span>
                        <Badge>{quarterStatusLabels[locale][entry.status]}</Badge>
                        {entry.reviewRating ? <span className="block text-xs text-slate-500">{copy.quarterRating}: {entry.reviewRating}/5</span> : null}
                      </td>
                    );
                  })}
                  <td className="py-3">{plan ? parseManagerNotes(plan.managerNotesJson).promotionReadiness || '—' : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
