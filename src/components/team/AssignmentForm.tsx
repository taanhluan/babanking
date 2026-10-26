'use client';
import { useRef, useState } from 'react';
import { projectedPeak, type AllocationLike, type BillableStatus } from '@/server/ba-team/ba-allocation-domain';

type Catalog = {
  customers: Array<{ id: string; name: string; isInternal: boolean; projects: Array<{ id: string; name: string; defaultBillableStatus: BillableStatus }> }>;
  roles: Array<{ id: string; name: string }>;
};
type Member = { id: string; name: string; capacity: number; assignments: Array<AllocationLike & { id: string }> };
type Values = { projectId?: string; roleId?: string; percent?: number; billableStatus?: BillableStatus; startDate?: string; endDate?: string | null };
type Labels = {
  ba: string; project: string; role: string; percent: string; billable: string; startDate: string; endDate: string; endDateHint: string;
  overConfirm: string; submit: string; internal: string; billableLabels: Record<BillableStatus, string>;
};

const inputClass = 'mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal';
const buttonClass = 'min-h-11 rounded-xl bg-royalBlue px-4 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royalBlue';

/**
 * Assignment editor. Before submitting it projects the BA's peak allocation and asks for confirmation
 * when it exceeds capacity (warn, never block). The server repeats the check authoritatively.
 */
export function AssignmentForm({ action, hidden, members, catalog, values = {}, replacingId, labels }: {
  action: (formData: FormData) => Promise<void>;
  hidden: Record<string, string>;
  members: Member[];
  catalog: Catalog;
  values?: Values;
  replacingId?: string;
  labels: Labels;
}) {
  const [userId, setUserId] = useState(members[0]?.id ?? '');
  const [billable, setBillable] = useState<BillableStatus>(values.billableStatus ?? 'BILLABLE');
  const confirmRef = useRef<HTMLInputElement>(null);
  const projects = new Map(catalog.customers.flatMap((customer) => customer.projects.map((project) => [project.id, project] as const)));

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    const member = members.find((entry) => entry.id === userId);
    const startDate = String(form.get('startDate') ?? '');
    const percent = Number(form.get('percent'));
    if (!member || !startDate || !Number.isFinite(percent) || !confirmRef.current) return;
    const endDate = String(form.get('endDate') ?? '') || null;
    const peak = projectedPeak(member.assignments, { percent, billableStatus: billable, startDate, endDate, cancelled: false }, replacingId);
    confirmRef.current.value = '';
    if (peak <= member.capacity) return;
    if (window.confirm(labels.overConfirm.replace('{peak}', String(peak)).replace('{capacity}', String(member.capacity)))) confirmRef.current.value = '1';
    else event.preventDefault();
  }

  return (
    <form action={action} onSubmit={onSubmit} className="grid gap-3">
      {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <input ref={confirmRef} type="hidden" name="confirmOverAllocation" defaultValue="" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {members.length > 1 ? (
          <label className="block min-w-0 text-sm font-semibold sm:col-span-2 lg:col-span-4">{labels.ba}
            <select name="userId" value={userId} onChange={(event) => setUserId(event.target.value)} className={inputClass}>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select>
          </label>
        ) : null}
        <label className="block min-w-0 text-sm font-semibold sm:col-span-2">{labels.project}
          <select name="projectId" required defaultValue={values.projectId ?? ''} onChange={(event) => { const project = projects.get(event.target.value); if (project) setBillable(project.defaultBillableStatus); }} className={inputClass}>
            <option value="" disabled>—</option>
            {catalog.customers.map((customer) => (
              <optgroup key={customer.id} label={customer.isInternal ? `${customer.name} (${labels.internal})` : customer.name}>
                {customer.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="block min-w-0 text-sm font-semibold sm:col-span-2">{labels.role}
          <select name="roleId" required defaultValue={values.roleId ?? ''} className={inputClass}><option value="" disabled>—</option>{catalog.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>
        </label>
        <label className="block min-w-0 text-sm font-semibold">{labels.percent}<input name="percent" type="number" required min={1} max={100} step={1} defaultValue={values.percent} className={inputClass} /></label>
        <label className="block min-w-0 text-sm font-semibold">{labels.billable}
          <select name="billableStatus" value={billable} onChange={(event) => setBillable(event.target.value as BillableStatus)} className={inputClass}>{(Object.keys(labels.billableLabels) as BillableStatus[]).map((status) => <option key={status} value={status}>{labels.billableLabels[status]}</option>)}</select>
        </label>
        <label className="block min-w-0 text-sm font-semibold">{labels.startDate}<input name="startDate" type="date" required defaultValue={values.startDate} className={inputClass} /></label>
        <label className="block min-w-0 text-sm font-semibold">{labels.endDate}<input name="endDate" type="date" defaultValue={values.endDate ?? ''} className={inputClass} /><span className="mt-1 block text-xs font-normal text-slate-500">{labels.endDateHint}</span></label>
      </div>
      <button className={`${buttonClass} justify-self-start`}>{labels.submit}</button>
    </form>
  );
}
