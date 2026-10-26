import { AllocationNav, formatDay } from '@/components/team/AllocationParts';
import { allocationCopy, billableLabels, levelLabels } from '@/components/team/allocation-copy';
import { Badge, TeamNav, cardClass, inputClass, secondaryButtonClass } from '@/components/team/TeamShell';
import { EmptyState, WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { getCurrentLocale } from '@/i18n/server';
import { customerReport, dateSchema, todayInTeamZone } from '@/server/ba-team/ba-allocation-domain';
import { BaAllocationRepository } from '@/server/ba-team/ba-allocation-repository';
import { requireBaTeamLead } from '@/server/ba-team/ba-team-access';

export default async function AllocationReportPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireBaTeamLead('/team/allocation/report');
  const [query, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const copy = allocationCopy[locale];
  const date = dateSchema.safeParse(query.date).success ? query.date as string : todayInTeamZone();
  const report = customerReport(await BaAllocationRepository.teamAllocation(), date);
  const tiles: Array<[string, string | number]> = [
    [copy.capacity, `${report.team.capacity} ${copy.fte}`],
    [copy.allocation, `${report.team.allocation} ${copy.fte}`],
    [copy.utilization, `${report.team.utilization}%`],
    [copy.billableUtilization, `${report.team.billableUtilization}%`],
    [copy.bench, report.team.bench],
    [copy.rollingOff, report.team.rollingOff],
  ];

  return (
    <>
      <TeamNav active="allocation" isLead />
      <WorkspaceTitle eyebrow={copy.subnav.report} title={copy.reportTitle} description={copy.reportDescription} />
      <AllocationNav active="report" locale={locale} />

      <form className="mb-5 flex flex-wrap items-end gap-3">
        <label className="block w-full text-sm font-semibold sm:w-48">{copy.referenceDate}<input type="date" name="date" defaultValue={date} className={inputClass} /></label>
        <button className={secondaryButtonClass}>{copy.apply}</button>
      </form>

      <section aria-label={copy.totalRow} className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-navy">{value}</p></div>)}
      </section>

      {report.customers.length ? (
        <div className="grid gap-4">
          {report.customers.map((customer) => (
            <section key={customer.id} className={cardClass}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-navy">{customer.name} {customer.isInternal ? <Badge>{copy.internal}</Badge> : null}</h2>
                <p className="text-sm text-textSecondary">{copy.baCount}: {customer.baCount} · {copy.fte}: {customer.fte} · {copy.billableFte}: {customer.billableFte} · {copy.partialFte}: {customer.partialFte}</p>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr><th className="py-2 pr-3">{copy.project}</th><th className="py-2 pr-3">{copy.baCount}</th><th className="py-2 pr-3">{copy.fte}</th><th className="py-2 pr-3">{copy.billableFte}</th><th className="py-2 pr-3">{copy.partialFte}</th><th className="py-2">{copy.details}</th></tr>
                  </thead>
                  <tbody>
                    {customer.projects.map((project) => (
                      <tr key={project.id} className="border-t border-slate-100 align-top">
                        <td className="py-3 pr-3 font-semibold">{project.name}</td>
                        <td className="py-3 pr-3">{project.baCount}</td>
                        <td className="py-3 pr-3">{project.fte}</td>
                        <td className="py-3 pr-3">{project.billableFte}</td>
                        <td className="py-3 pr-3">{project.partialFte}</td>
                        <td className="py-3">
                          <ul className="grid gap-1">
                            {project.lines.map((line, index) => <li key={`${line.memberId}-${index}`}><span className="font-semibold">{line.memberName}</span> · {line.level ? levelLabels[locale][line.level] : copy.notSet} · {line.role} · {line.percent}% · {billableLabels[locale][line.billableStatus]} · {copy.endDate}: {formatDay(line.endDate, locale)}</li>)}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      ) : <EmptyState title={copy.noActiveAssignments} description={copy.reportDescription} />}
      <p className="mt-4 text-xs text-slate-500">{copy.partialNote}</p>
    </>
  );
}
