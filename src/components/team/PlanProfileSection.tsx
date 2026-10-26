import { savePlanProfileAction } from '@/app/team/actions';
import type { SupportedLocale } from '@/i18n/config';
import { capabilityAreas, type BaPlanProfile } from '@/server/ba-team/ba-plan-domain';
import { buttonClass, cardClass, inputClass } from './TeamShell';
import { capabilityAreaLabels, longFields, profileSections, type TeamCopy } from './team-copy';

function fieldsOf(section: (typeof profileSections)[number]): readonly string[] {
  return section.fields === 'areas' ? capabilityAreas : section.fields;
}

function fieldLabel(copy: TeamCopy, locale: SupportedLocale, field: string) {
  return (capabilityAreaLabels[locale] as Record<string, string>)[field] ?? copy.fields[field] ?? field;
}

export function PlanProfileSection({ planId, profile, editable, copy, locale }: { planId: string; profile: BaPlanProfile; editable: boolean; copy: TeamCopy; locale: SupportedLocale }) {
  const values = profile as unknown as Record<string, Record<string, string>>;
  if (!editable) {
    return (
      <div className="grid gap-4">
        {profileSections.map((section) => (
          <section key={section.key} className={cardClass}>
            <h2 className="text-lg font-semibold text-navy">{copy.sections[section.key]}</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {fieldsOf(section).map((field) => (
                <div key={field} className={longFields.has(field) || section.fields === 'areas' ? 'sm:col-span-2' : ''}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{fieldLabel(copy, locale, field)}</dt>
                  <dd className="mt-1 whitespace-pre-line break-words text-sm text-slate-800">{values[section.key]?.[field] || '—'}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    );
  }
  return (
    <form action={savePlanProfileAction} className="grid gap-4">
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="tab" value="plan" />
      {profileSections.map((section) => (
        <fieldset key={section.key} className={cardClass}>
          <legend className="px-1 text-lg font-semibold text-navy">{copy.sections[section.key]}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {fieldsOf(section).map((field) => {
              const name = `profile.${section.key}.${field}`;
              const wide = longFields.has(field) || section.fields === 'areas';
              return (
                <label key={field} className={`block min-w-0 text-sm font-semibold ${wide ? 'sm:col-span-2' : ''}`}>
                  {fieldLabel(copy, locale, field)}
                  {wide
                    ? <textarea name={name} rows={3} maxLength={1500} defaultValue={values[section.key]?.[field] ?? ''} className={inputClass} />
                    : <input name={name} maxLength={1500} defaultValue={values[section.key]?.[field] ?? ''} className={inputClass} />}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <button className={`${buttonClass} justify-self-start`}>{copy.saveDraft}</button>
    </form>
  );
}
