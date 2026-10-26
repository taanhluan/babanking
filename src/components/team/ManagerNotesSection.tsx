import { saveManagerNotesAction } from '@/app/team/actions';
import type { ManagerNotes } from '@/server/ba-team/ba-plan-domain';
import { buttonClass, cardClass, inputClass } from './TeamShell';
import type { TeamCopy } from './team-copy';

const fields = ['recommendation', 'reviewPoint', 'promotionReadiness'] as const;

export function ManagerNotesSection({ planId, notes, editable, copy }: { planId: string; notes: ManagerNotes; editable: boolean; copy: TeamCopy }) {
  if (editable) {
    return (
      <form action={saveManagerNotesAction} className={`${cardClass} grid gap-3`}>
        <input type="hidden" name="planId" value={planId} />
        <input type="hidden" name="tab" value="notes" />
        <h2 className="text-lg font-semibold text-navy">{copy.managerNotes}</h2>
        {fields.map((field) => (
          <label key={field} className="block min-w-0 text-sm font-semibold">{copy[field]}
            {field === 'recommendation'
              ? <textarea name={field} rows={4} maxLength={1500} defaultValue={notes[field]} className={inputClass} />
              : <input name={field} maxLength={300} defaultValue={notes[field]} className={inputClass} />}
          </label>
        ))}
        <button className={`${buttonClass} justify-self-start`}>{copy.saveNotes}</button>
      </form>
    );
  }
  const empty = fields.every((field) => !notes[field]);
  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold text-navy">{copy.managerNotes}</h2>
      {empty ? <p className="mt-2 text-sm text-textSecondary">{copy.noNotes}</p> : (
        <dl className="mt-3 grid gap-3">
          {fields.map((field) => <div key={field}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy[field]}</dt><dd className="mt-1 whitespace-pre-line text-sm">{notes[field] || '—'}</dd></div>)}
        </dl>
      )}
    </section>
  );
}
