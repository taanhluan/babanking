import Link from 'next/link';
import type { Route } from 'next';
import { AllocationNav, forecastLegend } from '@/components/team/AllocationParts';
import { allocationCopy, forecastTone, levelLabels } from '@/components/team/allocation-copy';
import { TeamNav, cardClass, secondaryButtonClass } from '@/components/team/TeamShell';
import { WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { getCurrentLocale } from '@/i18n/server';
import { getLocalizedPath } from '@/i18n/routing';
import { monthCell, monthRange, monthSchema, shiftMonth, todayInTeamZone } from '@/server/ba-team/ba-allocation-domain';
import { BaAllocationRepository } from '@/server/ba-team/ba-allocation-repository';
import { requireBaTeamLead } from '@/server/ba-team/ba-team-access';

const MONTHS = 3;

export default async function AllocationTimelinePage({ searchParams }: { searchParams: Promise<{ start?: string }> }) {
  await requireBaTeamLead('/team/allocation/timeline');
  const [query, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const copy = allocationCopy[locale];
  const currentMonth = todayInTeamZone().slice(0, 7);
  const start = monthSchema.safeParse(query.start).success ? query.start as string : currentMonth;
  const months = monthRange(start, MONTHS);
  const team = await BaAllocationRepository.teamAllocation();
  const monthLabel = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const href = (month: string) => getLocalizedPath(`/team/allocation/timeline?start=${month}`, locale) as Route;

  return (
    <>
      <TeamNav active="allocation" isLead />
      <WorkspaceTitle eyebrow={copy.subnav.timeline} title={copy.timelineTitle} description={copy.timelineDescription} />
      <AllocationNav active="timeline" locale={locale} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={href(shiftMonth(start, -1))} className={`${secondaryButtonClass} inline-flex items-center`}>{copy.previous}</Link>
        {start !== currentMonth ? <Link href={href(currentMonth)} className={`${secondaryButtonClass} inline-flex items-center`}>{copy.thisMonth}</Link> : null}
        <Link href={href(shiftMonth(start, 1))} className={`${secondaryButtonClass} inline-flex items-center`}>{copy.next}</Link>
      </div>

      <div className={`${cardClass} overflow-x-auto`}>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr><th className="py-2 pr-3">{copy.ba}</th>{months.map((month) => <th key={month} className="py-2 pr-3">{monthLabel.format(new Date(`${month}-01T00:00:00Z`))}</th>)}</tr>
          </thead>
          <tbody>
            {team.map((member) => (
              <tr key={member.id} className="border-t border-slate-100">
                <td className="py-3 pr-3"><span className="font-semibold">{member.name}</span><span className="block text-xs text-slate-500">{member.level ? levelLabels[locale][member.level] : copy.notSet} · {member.capacity}%</span></td>
                {months.map((month) => {
                  const cell = monthCell(member.assignments, member.capacity, month);
                  const detail = cell.contributors.map((entry) => `${entry.project.customer.name} · ${entry.project.name}: ${entry.percent}%`).join('\n');
                  return (
                    <td key={month} className="py-2 pr-3">
                      <span title={detail || undefined} className={`flex min-h-11 items-center justify-center rounded-lg border font-semibold ${forecastTone[cell.band]}`}>
                        {cell.peak}%
                        {detail ? <span className="sr-only">: {detail}</span> : null}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">{forecastLegend(locale, ['AVAILABLE_SOON'])}</div>
    </>
  );
}
