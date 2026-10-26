import { notFound } from 'next/navigation';
import { deleteAssignmentAction, saveManagerAssessmentAction, setAssignmentCancelledAction, updateAssignmentAction } from '@/app/team/allocation-actions';
import { AllocationHistory, AssignmentLine, assignmentFormLabels, projectionOf } from '@/components/team/AllocationParts';
import { AssignmentForm } from '@/components/team/AssignmentForm';
import { allocationCopy, performanceLabels, riskLabels } from '@/components/team/allocation-copy';
import { ResultBanner, TeamNav, buttonClass, cardClass, dangerButtonClass, inputClass, secondaryButtonClass } from '@/components/team/TeamShell';
import { WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { getCurrentLocale } from '@/i18n/server';
import { performanceRatings, riskLevels, todayInTeamZone } from '@/server/ba-team/ba-allocation-domain';
import { canCancelAssignment, canManageAssignment, canWriteManagerAssessment } from '@/server/ba-team/ba-allocation-policy';
import { BaAllocationRepository } from '@/server/ba-team/ba-allocation-repository';
import { isBaTeamLead } from '@/server/ba-team/ba-plan-policy';
import { requireBaTeamMember } from '@/server/ba-team/ba-team-access';

export default async function AssignmentPage({ params, searchParams }: { params: Promise<{ allocationId: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const actor = await requireBaTeamMember('/team/my-allocation');
  const { allocationId } = await params;
  const assignment = await BaAllocationRepository.getAssignment(allocationId);
  if (!assignment || !canManageAssignment(actor, assignment.userId)) notFound();
  const [query, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const copy = allocationCopy[locale];
  const [catalog, owned, profile, history, names] = await Promise.all([
    BaAllocationRepository.catalog(),
    BaAllocationRepository.listForUser(assignment.userId),
    BaAllocationRepository.capacityFor(assignment.userId),
    BaAllocationRepository.history({ allocationId: assignment.id }),
    BaAllocationRepository.catalogNames(),
  ]);
  // Keep the current project and role selectable even if they were deactivated later.
  if (!catalog.customers.some((customer) => customer.projects.some((project) => project.id === assignment.projectId))) {
    catalog.customers.push({ id: assignment.project.customer.id, name: assignment.project.customer.name, isInternal: assignment.project.customer.isInternal, isActive: false, projects: [{ id: assignment.project.id, name: assignment.project.name, defaultBillableStatus: assignment.billableStatus, isActive: false, _count: { allocations: 0 } }] });
  }
  if (!catalog.roles.some((role) => role.id === assignment.roleId)) catalog.roles.push({ ...assignment.role, sortOrder: 999, isActive: false });

  const own = assignment.userId === actor.id;
  const lead = isBaTeamLead(actor);
  const backPath = own ? '/team/my-allocation' : '/team/allocation';
  const returnTo = `/team/assignments/${assignment.id}`;
  const today = todayInTeamZone();
  const hidden = { returnTo, allocationId: assignment.id };

  return (
    <>
      <TeamNav active={own ? 'myAllocation' : 'allocation'} isLead={lead} />
      <WorkspaceTitle eyebrow={assignment.user.name} title={`${assignment.project.customer.name} · ${assignment.project.name}`} description={copy.editAssignment} />
      <ResultBanner error={query.error} saved={query.saved} savedLabel={copy.saved} />

      <section className={`${cardClass} mb-5`}><AssignmentLine assignment={assignment} today={today} locale={locale} /></section>

      <section className={`${cardClass} mb-5`}>
        <h2 className="mb-3 text-lg font-semibold text-navy">{copy.editAssignment}</h2>
        <AssignmentForm
          action={updateAssignmentAction}
          hidden={hidden}
          members={[{ id: assignment.userId, name: assignment.user.name, capacity: profile.capacityPercent, assignments: projectionOf(owned) }]}
          catalog={catalog}
          values={{ projectId: assignment.projectId, roleId: assignment.roleId, percent: assignment.percent, billableStatus: assignment.billableStatus, startDate: assignment.startDate, endDate: assignment.endDate }}
          replacingId={assignment.id}
          labels={assignmentFormLabels(copy, locale, copy.saveAssignment)}
        />
      </section>

      <section className={`${cardClass} mb-5 grid gap-3`}>
        <h2 className="text-lg font-semibold text-navy">{copy.assessment}</h2>
        {canWriteManagerAssessment(actor) ? (
          <form action={saveManagerAssessmentAction} className="grid gap-3 sm:grid-cols-2">
            {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
            <label className="block min-w-0 text-sm font-semibold">{copy.performance}<select name="performance" defaultValue={assignment.performance ?? ''} className={inputClass}><option value="">—</option>{performanceRatings.map((value) => <option key={value} value={value}>{performanceLabels[locale][value]}</option>)}</select></label>
            <label className="block min-w-0 text-sm font-semibold">{copy.risk}<select name="risk" defaultValue={assignment.risk ?? ''} className={inputClass}><option value="">—</option>{riskLevels.map((value) => <option key={value} value={value}>{riskLabels[locale][value]}</option>)}</select></label>
            <label className="block min-w-0 text-sm font-semibold sm:col-span-2">{copy.managerRemark}<textarea name="managerRemark" rows={3} maxLength={1000} defaultValue={assignment.managerRemark ?? ''} className={inputClass} /></label>
            <button className={`${buttonClass} justify-self-start`}>{copy.saveAssessment}</button>
          </form>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-3">
            {[[copy.performance, assignment.performance ? performanceLabels[locale][assignment.performance] : '—'], [copy.risk, assignment.risk ? riskLabels[locale][assignment.risk] : '—'], [copy.managerRemark, assignment.managerRemark || '—']].map(([label, value]) => (
              <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-line break-words text-sm">{value}</dd></div>
            ))}
            <p className="text-xs text-slate-500 sm:col-span-3">{copy.managerOnly}</p>
          </dl>
        )}
      </section>

      <section className={`${cardClass} mb-5 flex flex-wrap items-start gap-3`}>
        {canCancelAssignment(actor) ? (
          <form action={setAssignmentCancelledAction} className="grid max-w-sm gap-1">
            {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
            <input type="hidden" name="cancelled" value={String(!assignment.cancelled)} />
            <button className={`${secondaryButtonClass} justify-self-start`}>{assignment.cancelled ? copy.restoreAssignment : copy.cancelAssignment}</button>
            <span className="text-xs text-slate-500">{copy.cancelHint}</span>
          </form>
        ) : null}
        <details className="min-w-[260px] flex-1 rounded-xl border border-red-200 p-3">
          <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-red-700">{copy.deleteAssignment}</summary>
          <p className="mt-2 text-xs text-slate-600">{copy.deleteHint}</p>
          <form action={deleteAssignmentAction} className="mt-2">
            {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
            <input type="hidden" name="afterDelete" value={backPath} />
            <button className={dangerButtonClass}>{copy.deleteAssignment}</button>
          </form>
        </details>
      </section>

      <AllocationHistory entries={history} names={names} locale={locale} />
    </>
  );
}
