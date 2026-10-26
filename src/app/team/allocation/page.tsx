import { createAssignmentAction } from '@/app/team/allocation-actions';
import { AllocationNav, AssignmentLine, ForecastBadge, assignmentFormLabels, nextAvailableLabel, projectionOf } from '@/components/team/AllocationParts';
import { AssignmentForm } from '@/components/team/AssignmentForm';
import { allocationCopy, billableLabels, forecastLabels, levelLabels } from '@/components/team/allocation-copy';
import { Badge, ResultBanner, TeamNav, cardClass, inputClass, secondaryButtonClass } from '@/components/team/TeamShell';
import { EmptyState, WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { getCurrentLocale } from '@/i18n/server';
import { assignmentStatus, billableStatuses, dateSchema, forecastStatuses, summarizeAllocations, todayInTeamZone } from '@/server/ba-team/ba-allocation-domain';
import { BaAllocationRepository } from '@/server/ba-team/ba-allocation-repository';
import { requireBaTeamLead } from '@/server/ba-team/ba-team-access';

type Query = { date?: string; customer?: string; project?: string; billable?: string; forecast?: string; error?: string; saved?: string };

export default async function TeamAllocationPage({ searchParams }: { searchParams: Promise<Query> }) {
  await requireBaTeamLead('/team/allocation');
  const [query, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const copy = allocationCopy[locale];
  const today = todayInTeamZone();
  const date = dateSchema.safeParse(query.date).success ? query.date as string : today;
  const billable = billableStatuses.find((value) => value === query.billable);
  const forecast = forecastStatuses.find((value) => value === query.forecast);
  const [team, catalog, fullCatalog] = await Promise.all([BaAllocationRepository.teamAllocation(), BaAllocationRepository.catalog(), BaAllocationRepository.catalog({ all: true })]);
  const projects = fullCatalog.customers.flatMap((customer) => customer.projects.map((project) => ({ ...project, customerId: customer.id, customerName: customer.name })));

  const rows = team.map((member) => {
    const live = member.assignments.filter((entry) => !entry.cancelled);
    const visible = member.assignments.filter((entry) => assignmentStatus(entry, date) !== 'ENDED'
      && (!query.customer || entry.project.customer.id === query.customer)
      && (!query.project || entry.project.id === query.project)
      && (!billable || entry.billableStatus === billable));
    return { ...member, summary: summarizeAllocations(live, member.capacity, date), visible };
  }).filter((row) => (!forecast || row.summary.forecast === forecast) && (!(query.customer || query.project || billable) || row.visible.length));

  const returnTo = '/team/allocation';
  const catalogReady = catalog.roles.length > 0 && catalog.customers.some((customer) => customer.projects.length > 0);

  return (
    <>
      <TeamNav active="allocation" isLead />
      <WorkspaceTitle eyebrow={copy.subnav.table} title={copy.teamTitle} description={copy.teamDescription} />
      <AllocationNav active="table" locale={locale} />
      <ResultBanner error={query.error} saved={query.saved} savedLabel={copy.saved} />

      <form className={`${cardClass} mb-5 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]`}>
        <label className="block min-w-0 text-sm font-semibold">{copy.referenceDate}<input type="date" name="date" defaultValue={date} className={inputClass} /></label>
        <label className="block min-w-0 text-sm font-semibold">{copy.customer}<select name="customer" defaultValue={query.customer ?? ''} className={inputClass}><option value="">{copy.all}</option>{fullCatalog.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
        <label className="block min-w-0 text-sm font-semibold">{copy.project}<select name="project" defaultValue={query.project ?? ''} className={inputClass}><option value="">{copy.all}</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.customerName} · {project.name}</option>)}</select></label>
        <label className="block min-w-0 text-sm font-semibold">{copy.billable}<select name="billable" defaultValue={billable ?? ''} className={inputClass}><option value="">{copy.all}</option>{billableStatuses.map((value) => <option key={value} value={value}>{billableLabels[locale][value]}</option>)}</select></label>
        <label className="block min-w-0 text-sm font-semibold">{copy.forecast}<select name="forecast" defaultValue={forecast ?? ''} className={inputClass}><option value="">{copy.all}</option>{forecastStatuses.map((value) => <option key={value} value={value}>{forecastLabels[locale][value]}</option>)}</select></label>
        <button className={secondaryButtonClass}>{copy.apply}</button>
      </form>

      <details className={`${cardClass} mb-5`}>
        <summary className="min-h-11 cursor-pointer content-center font-semibold text-royalBlue">+ {copy.addAssignment}</summary>
        <div className="mt-3">
          {catalogReady && team.length ? (
            <AssignmentForm
              action={createAssignmentAction}
              hidden={{ returnTo }}
              members={team.map((member) => ({ id: member.id, name: member.name, capacity: member.capacity, assignments: projectionOf(member.assignments) }))}
              catalog={catalog}
              labels={assignmentFormLabels(copy, locale, copy.addAssignment)}
            />
          ) : <p className="text-sm text-textSecondary">{copy.catalogEmpty}</p>}
        </div>
      </details>

      {rows.length ? (
        <div className="grid gap-3">
          <div aria-hidden="true" className="hidden gap-3 px-5 text-xs font-semibold uppercase text-slate-500 sm:grid sm:grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,1fr))]">
            {[copy.ba, copy.capacity, copy.allocation, copy.available, copy.forecast, copy.nextAvailable].map((label) => <span key={label}>{label}</span>)}
          </div>
          {rows.map((row) => (
            <details key={row.id} open={row.summary.overAllocated} className={`${cardClass} ${row.summary.overAllocated ? 'border-red-300' : ''}`}>
              <summary className="grid cursor-pointer gap-3 sm:grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,1fr))] sm:items-center">
                <span className="min-w-0"><span className="block truncate font-semibold text-navy">{row.name}</span><span className="block text-xs text-slate-500">{row.level ? levelLabels[locale][row.level] : copy.notSet}</span></span>
                <Metric label={copy.capacity} value={`${row.capacity}%`} />
                <Metric label={copy.allocation} value={`${row.summary.allocation}%`} />
                <Metric label={copy.available} value={`${row.summary.available}%`} danger={row.summary.overAllocated} />
                <span className="text-sm"><span className="block text-xs text-slate-500 sm:hidden">{copy.forecast}</span><ForecastBadge status={row.summary.forecast} locale={locale} /></span>
                <Metric label={copy.nextAvailable} value={nextAvailableLabel(row.summary, date, copy, locale)} />
              </summary>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                  <Badge>{copy.billableUtilization}: {row.summary.billableUtilization}%</Badge>
                  {row.summary.partialBillable ? <Badge>{copy.partialBillable}: {row.summary.partialBillable}%</Badge> : null}
                </div>
                {row.visible.length ? (
                  <ul className="grid gap-2">
                    {row.visible.map((assignment) => <li key={assignment.id} className="rounded-xl border border-slate-200 p-3"><AssignmentLine assignment={assignment} today={date} locale={locale} href={`/team/assignments/${assignment.id}`} /></li>)}
                  </ul>
                ) : <p className="text-sm text-textSecondary">{copy.noActiveAssignments}</p>}
              </div>
            </details>
          ))}
        </div>
      ) : <EmptyState title={copy.noAssignments} description={copy.teamDescription} />}

      <p className="mt-4 text-xs text-slate-500">{copy.partialNote}</p>
    </>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return <span className="text-sm"><span className="block text-xs text-slate-500 sm:hidden">{label}</span><span className={`font-semibold ${danger ? 'text-red-700' : 'text-navy'}`}>{value}</span></span>;
}
