import { createAssignmentAction, createCustomerAction, createProjectAction } from '@/app/team/allocation-actions';
import { AllocationHistory, AssignmentLine, SummaryTiles, assignmentFormLabels, projectionOf } from '@/components/team/AllocationParts';
import { AssignmentForm } from '@/components/team/AssignmentForm';
import { allocationCopy, billableLabels, levelLabels } from '@/components/team/allocation-copy';
import { ResultBanner, TeamNav, buttonClass, cardClass, inputClass, secondaryButtonClass } from '@/components/team/TeamShell';
import { EmptyState, WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { getCurrentLocale } from '@/i18n/server';
import { assignmentStatus, billableStatuses, summarizeAllocations, todayInTeamZone } from '@/server/ba-team/ba-allocation-domain';
import { BaAllocationRepository } from '@/server/ba-team/ba-allocation-repository';
import { isBaTeamLead } from '@/server/ba-team/ba-plan-policy';
import { requireBaTeamMember } from '@/server/ba-team/ba-team-access';

const returnTo = '/team/my-allocation';

export default async function MyAllocationPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const actor = await requireBaTeamMember(returnTo);
  const [params, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const copy = allocationCopy[locale];
  const [assignments, profile, catalog, history, names] = await Promise.all([
    BaAllocationRepository.listForUser(actor.id),
    BaAllocationRepository.capacityFor(actor.id),
    BaAllocationRepository.catalog(),
    BaAllocationRepository.history({ userId: actor.id }),
    BaAllocationRepository.catalogNames(),
  ]);
  const today = todayInTeamZone();
  const summary = summarizeAllocations(assignments, profile.capacityPercent, today);
  const groups = [
    { title: copy.current, items: assignments.filter((entry) => assignmentStatus(entry, today) === 'ACTIVE') },
    { title: copy.upcoming, items: assignments.filter((entry) => assignmentStatus(entry, today) === 'PLANNED') },
    { title: copy.ended, items: assignments.filter((entry) => assignmentStatus(entry, today) === 'ENDED') },
    { title: copy.cancelled, items: assignments.filter((entry) => assignmentStatus(entry, today) === 'CANCELLED') },
  ].filter((group) => group.items.length);
  const catalogReady = catalog.roles.length > 0 && catalog.customers.some((customer) => customer.projects.length > 0);

  return (
    <>
      <TeamNav active="myAllocation" isLead={isBaTeamLead(actor)} />
      <WorkspaceTitle eyebrow={`${copy.level}: ${profile.level ? levelLabels[locale][profile.level] : copy.notSet}`} title={copy.myTitle} description={copy.myDescription} />
      <ResultBanner error={params.error} saved={params.saved} savedLabel={copy.saved} />
      <SummaryTiles summary={summary} today={today} copy={copy} locale={locale} />

      {groups.length ? (
        <div className="mb-5 grid gap-4">
          {groups.map((group) => (
            <section key={group.title} className={cardClass}>
              <h2 className="text-lg font-semibold text-navy">{group.title} ({group.items.length})</h2>
              <ul className="mt-3 grid gap-3">
                {group.items.map((assignment) => <li key={assignment.id} className="rounded-xl border border-slate-200 p-3"><AssignmentLine assignment={assignment} today={today} locale={locale} href={`/team/assignments/${assignment.id}`} /></li>)}
              </ul>
            </section>
          ))}
        </div>
      ) : <div className="mb-5"><EmptyState title={copy.noAssignments} description={copy.myDescription} /></div>}

      <section className={`${cardClass} mb-5`}>
        <h2 className="text-lg font-semibold text-navy">{copy.addAssignment}</h2>
        {catalogReady ? (
          <div className="mt-3">
            <AssignmentForm
              action={createAssignmentAction}
              hidden={{ returnTo }}
              members={[{ id: actor.id, name: actor.name, capacity: profile.capacityPercent, assignments: projectionOf(assignments) }]}
              catalog={catalog}
              labels={assignmentFormLabels(copy, locale, copy.addAssignment)}
            />
          </div>
        ) : <p className="mt-2 text-sm text-textSecondary">{copy.catalogEmpty}</p>}
        <details className="mt-4 rounded-xl border border-slate-200 p-3">
          <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-royalBlue">{copy.missingProject}</summary>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {catalog.customers.length ? (
              <form action={createProjectAction} className="grid gap-3">
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="block min-w-0 text-sm font-semibold">{copy.customer}<select name="customerId" required className={inputClass}>{catalog.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                <label className="block min-w-0 text-sm font-semibold">{copy.projectName}<input name="name" required minLength={2} maxLength={120} className={inputClass} /></label>
                <label className="block min-w-0 text-sm font-semibold">{copy.defaultBillable}<select name="defaultBillableStatus" defaultValue="BILLABLE" className={inputClass}>{billableStatuses.map((status) => <option key={status} value={status}>{billableLabels[locale][status]}</option>)}</select></label>
                <button className={`${buttonClass} justify-self-start`}>{copy.addProject}</button>
              </form>
            ) : null}
            <form action={createCustomerAction} className="grid content-start gap-3">
              <input type="hidden" name="returnTo" value={returnTo} />
              <label className="block min-w-0 text-sm font-semibold">{copy.newCustomerName}<input name="name" required minLength={2} maxLength={120} className={inputClass} /></label>
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isInternal" value="true" className="h-4 w-4" />{copy.internal}</label>
              <button className={`${secondaryButtonClass} justify-self-start`}>{copy.addCustomer}</button>
            </form>
          </div>
        </details>
      </section>

      <AllocationHistory entries={history} names={names} locale={locale} />
    </>
  );
}
