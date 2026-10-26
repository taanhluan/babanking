import {
  createCustomerAction, createProjectAction, mergeCustomerAction, mergeProjectAction, saveProjectRoleAction, saveTeamProfileAction, updateCustomerAction,
  updateProjectAction,
} from '@/app/team/allocation-actions';
import { AllocationNav } from '@/components/team/AllocationParts';
import { allocationCopy, billableLabels, levelLabels, type AllocationCopy } from '@/components/team/allocation-copy';
import { Badge, ResultBanner, TeamNav, buttonClass, cardClass, inputClass, secondaryButtonClass } from '@/components/team/TeamShell';
import { WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { getCurrentLocale } from '@/i18n/server';
import { baLevels, billableStatuses } from '@/server/ba-team/ba-allocation-domain';
import { BaAllocationRepository } from '@/server/ba-team/ba-allocation-repository';
import { requireBaTeamLead } from '@/server/ba-team/ba-team-access';

const returnTo = '/team/allocation/settings';
const Return = () => <input type="hidden" name="returnTo" value={returnTo} />;

function ActiveSelect({ value, copy }: { value: boolean; copy: AllocationCopy }) {
  return <label className="block min-w-0 text-sm font-semibold">{copy.status}<select name="isActive" defaultValue={String(value)} className={inputClass}><option value="true">{copy.active}</option><option value="false">{copy.inactive}</option></select></label>;
}

export default async function AllocationSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  await requireBaTeamLead(returnTo);
  const [query, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const copy = allocationCopy[locale];
  const [catalog, members] = await Promise.all([BaAllocationRepository.catalog({ all: true }), BaAllocationRepository.listTeamMembers()]);
  const projects = catalog.customers.flatMap((customer) => customer.projects.map((project) => ({ ...project, customerId: customer.id, customerName: customer.name })));
  const sectionTitle = 'text-lg font-semibold text-navy';
  const rowClass = 'rounded-xl border border-slate-200 p-3';

  return (
    <>
      <TeamNav active="allocation" isLead />
      <WorkspaceTitle eyebrow={copy.subnav.settings} title={copy.settingsTitle} description={copy.settingsDescription} />
      <AllocationNav active="settings" locale={locale} />
      <ResultBanner error={query.error} saved={query.saved} savedLabel={copy.saved} />

      <div className="grid gap-5">
        <section className={cardClass}>
          <h2 className={sectionTitle}>{copy.profiles}</h2>
          <ul className="mt-3 grid gap-2">
            {members.map((member) => (
              <li key={member.id} className={rowClass}>
                <form action={saveTeamProfileAction} className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_auto] sm:items-end">
                  <Return /><input type="hidden" name="userId" value={member.id} />
                  <span className="min-w-0 self-center"><span className="block truncate font-semibold">{member.name}</span><span className="block truncate text-xs text-slate-500">{member.email}</span>{member.isBaTeamMember ? null : <Badge>Lead</Badge>}</span>
                  <label className="block min-w-0 text-sm font-semibold">{copy.level}<select name="level" defaultValue={member.baTeamProfile?.level ?? ''} className={inputClass}><option value="">{copy.notSet}</option>{baLevels.map((level) => <option key={level} value={level}>{levelLabels[locale][level]}</option>)}</select></label>
                  <label className="block min-w-0 text-sm font-semibold">{copy.capacity} (%)<input name="capacityPercent" type="number" min={0} max={100} required defaultValue={member.baTeamProfile?.capacityPercent ?? 100} className={inputClass} /></label>
                  <label className="block min-w-0 text-sm font-semibold">{copy.hoursPerWeek}<input name="hoursPerWeek" type="number" min={0} max={80} required defaultValue={member.baTeamProfile?.hoursPerWeek ?? 40} className={inputClass} /></label>
                  <button className={secondaryButtonClass}>{copy.save}</button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass}>
          <h2 className={sectionTitle}>{copy.customers}</h2>
          <form action={createCustomerAction} className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
            <Return />
            <label className="block min-w-0 text-sm font-semibold">{copy.newCustomerName}<input name="name" required minLength={2} maxLength={120} className={inputClass} /></label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isInternal" value="true" className="h-4 w-4" />{copy.internal}</label>
            <button className={buttonClass}>{copy.addCustomer}</button>
          </form>
          <ul className="mt-4 grid gap-2">
            {catalog.customers.map((customer) => (
              <li key={customer.id} className={rowClass}>
                <details>
                  <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-2"><span className="font-semibold">{customer.name}</span>{customer.isInternal ? <Badge>{copy.internal}</Badge> : null}<Badge>{customer.isActive ? copy.active : copy.inactive}</Badge><span className="text-xs text-slate-500">{customer.projects.length} {copy.projects.toLowerCase()}</span></summary>
                  <div className="mt-3 grid gap-4 lg:grid-cols-2">
                    <form action={updateCustomerAction} className="grid gap-3">
                      <Return /><input type="hidden" name="customerId" value={customer.id} />
                      <label className="block min-w-0 text-sm font-semibold">{copy.name}<input name="name" required minLength={2} maxLength={120} defaultValue={customer.name} className={inputClass} /></label>
                      <label className="block min-w-0 text-sm font-semibold">{copy.internal}<select name="isInternal" defaultValue={String(customer.isInternal)} className={inputClass}><option value="false">—</option><option value="true">{copy.internal}</option></select></label>
                      <ActiveSelect value={customer.isActive} copy={copy} />
                      <button className={`${secondaryButtonClass} justify-self-start`}>{copy.save}</button>
                    </form>
                    {catalog.customers.length > 1 ? (
                      <form action={mergeCustomerAction} className="grid content-start gap-3">
                        <Return /><input type="hidden" name="customerId" value={customer.id} />
                        <label className="block min-w-0 text-sm font-semibold">{copy.merge}<select name="targetId" required className={inputClass}>{catalog.customers.filter((entry) => entry.id !== customer.id).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
                        <p className="text-xs text-slate-500">{copy.mergeHint}</p>
                        <button className={`${secondaryButtonClass} justify-self-start`}>{copy.merge}</button>
                      </form>
                    ) : null}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass}>
          <h2 className={sectionTitle}>{copy.projects}</h2>
          {catalog.customers.some((customer) => customer.isActive) ? (
            <form action={createProjectAction} className="mt-3 grid gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-end">
              <Return />
              <label className="block min-w-0 text-sm font-semibold">{copy.customer}<select name="customerId" required className={inputClass}>{catalog.customers.filter((customer) => customer.isActive).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
              <label className="block min-w-0 text-sm font-semibold">{copy.projectName}<input name="name" required minLength={2} maxLength={120} className={inputClass} /></label>
              <label className="block min-w-0 text-sm font-semibold">{copy.defaultBillable}<select name="defaultBillableStatus" defaultValue="BILLABLE" className={inputClass}>{billableStatuses.map((status) => <option key={status} value={status}>{billableLabels[locale][status]}</option>)}</select></label>
              <button className={buttonClass}>{copy.addProject}</button>
            </form>
          ) : <p className="mt-2 text-sm text-textSecondary">{copy.catalogEmpty}</p>}
          <ul className="mt-4 grid gap-2">
            {projects.map((project) => (
              <li key={project.id} className={rowClass}>
                <details>
                  <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-2"><span className="font-semibold">{project.customerName} · {project.name}</span><Badge>{billableLabels[locale][project.defaultBillableStatus]}</Badge><Badge>{project.isActive ? copy.active : copy.inactive}</Badge><span className="text-xs text-slate-500">{project._count.allocations} assignment</span></summary>
                  <div className="mt-3 grid gap-4 lg:grid-cols-2">
                    <form action={updateProjectAction} className="grid gap-3">
                      <Return /><input type="hidden" name="projectId" value={project.id} />
                      <label className="block min-w-0 text-sm font-semibold">{copy.customer}<select name="customerId" defaultValue={project.customerId} className={inputClass}>{catalog.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                      <label className="block min-w-0 text-sm font-semibold">{copy.name}<input name="name" required minLength={2} maxLength={120} defaultValue={project.name} className={inputClass} /></label>
                      <label className="block min-w-0 text-sm font-semibold">{copy.defaultBillable}<select name="defaultBillableStatus" defaultValue={project.defaultBillableStatus} className={inputClass}>{billableStatuses.map((status) => <option key={status} value={status}>{billableLabels[locale][status]}</option>)}</select></label>
                      <ActiveSelect value={project.isActive} copy={copy} />
                      <button className={`${secondaryButtonClass} justify-self-start`}>{copy.save}</button>
                    </form>
                    {projects.length > 1 ? (
                      <form action={mergeProjectAction} className="grid content-start gap-3">
                        <Return /><input type="hidden" name="projectId" value={project.id} />
                        <label className="block min-w-0 text-sm font-semibold">{copy.merge}<select name="targetId" required className={inputClass}>{projects.filter((entry) => entry.id !== project.id).map((entry) => <option key={entry.id} value={entry.id}>{entry.customerName} · {entry.name}</option>)}</select></label>
                        <p className="text-xs text-slate-500">{copy.mergeHint}</p>
                        <button className={`${secondaryButtonClass} justify-self-start`}>{copy.merge}</button>
                      </form>
                    ) : null}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass}>
          <h2 className={sectionTitle}>{copy.roles}</h2>
          <form action={saveProjectRoleAction} className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
            <Return />
            <label className="block min-w-0 text-sm font-semibold">{copy.name}<input name="name" required minLength={2} maxLength={120} className={inputClass} /></label>
            <label className="block min-w-0 text-sm font-semibold">{copy.sortOrder}<input name="sortOrder" type="number" min={0} max={999} defaultValue={catalog.roles.length} className={inputClass} /></label>
            <button className={buttonClass}>{copy.save}</button>
          </form>
          <ul className="mt-4 grid gap-2">
            {catalog.roles.map((role) => (
              <li key={role.id} className={rowClass}>
                <form action={saveProjectRoleAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem_auto] sm:items-end">
                  <Return /><input type="hidden" name="roleId" value={role.id} />
                  <label className="block min-w-0 text-sm font-semibold">{copy.name}<input name="name" required minLength={2} maxLength={120} defaultValue={role.name} className={inputClass} /></label>
                  <label className="block min-w-0 text-sm font-semibold">{copy.sortOrder}<input name="sortOrder" type="number" min={0} max={999} defaultValue={role.sortOrder} className={inputClass} /></label>
                  <ActiveSelect value={role.isActive} copy={copy} />
                  <button className={secondaryButtonClass}>{copy.save}</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
