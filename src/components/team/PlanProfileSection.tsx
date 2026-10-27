import { addAnnualGoalAction, removeAnnualGoalAction, savePlanProfileAction, updateAnnualGoalAction } from '@/app/team/actions';
import type { SupportedLocale } from '@/i18n/config';
import { baLevels } from '@/server/ba-team/ba-allocation-domain';
import { MAX_ANNUAL_GOALS, capabilityAreas, hasLegacyProfileContent, type AnnualGoal, type BaPlanProfile } from '@/server/ba-team/ba-plan-domain';
import { levelLabels } from './allocation-copy';
import { buttonClass, cardClass, dangerButtonClass, inputClass } from './TeamShell';
import { capabilityAreaLabels, longFields, profileSections, type TeamCopy } from './team-copy';

type Level = (typeof baLevels)[number];
const isLevel = (value: string): value is Level => (baLevels as readonly string[]).includes(value);

function fieldsOf(section: (typeof profileSections)[number]): readonly string[] {
  return section.fields === 'areas' ? capabilityAreas : section.fields;
}

function fieldLabel(copy: TeamCopy, locale: SupportedLocale, field: string) {
  return (capabilityAreaLabels[locale] as Record<string, string>)[field] ?? copy.fields[field] ?? field;
}

function levelText(level: string, locale: SupportedLocale) {
  return isLevel(level) ? levelLabels[locale][level] : level;
}

function Hidden({ planId, goalKey }: { planId: string; goalKey?: string }) {
  return <><input type="hidden" name="planId" value={planId} /><input type="hidden" name="tab" value="plan" />{goalKey ? <input type="hidden" name="goalKey" value={goalKey} /> : null}</>;
}

function GoalFields({ copy, goal }: { copy: TeamCopy; goal?: AnnualGoal }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block min-w-0 text-sm font-semibold">{copy.goals.goal}<input required name="title" minLength={3} maxLength={200} defaultValue={goal?.title} className={inputClass} /></label>
      <label className="block min-w-0 text-sm font-semibold">{copy.goals.measure}<input name="measure" maxLength={300} placeholder={copy.goals.measurePlaceholder} defaultValue={goal?.measure} className={inputClass} /></label>
    </div>
  );
}

/** Read-only view of the sections written with the earlier, longer template; they are no longer edited. */
function LegacySections({ profile, copy, locale }: { profile: BaPlanProfile; copy: TeamCopy; locale: SupportedLocale }) {
  const values = profile as unknown as Record<string, Record<string, string>>;
  const sections = profileSections.filter((section) => section.key !== 'personal' && fieldsOf(section).some((field) => values[section.key]?.[field]?.trim()));
  return (
    <details className={cardClass}>
      <summary className="min-h-11 cursor-pointer content-center font-semibold text-navy">{copy.goals.legacy}</summary>
      <div className="mt-3 grid gap-4">
        {sections.map((section) => (
          <section key={section.key}>
            <h3 className="font-semibold text-navy">{copy.sections[section.key]}</h3>
            <dl className="mt-2 grid gap-3 sm:grid-cols-2">
              {fieldsOf(section).filter((field) => values[section.key]?.[field]?.trim()).map((field) => (
                <div key={field} className={longFields.has(field) || section.fields === 'areas' ? 'sm:col-span-2' : ''}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{fieldLabel(copy, locale, field)}</dt>
                  <dd className="mt-1 whitespace-pre-line break-words text-sm text-slate-800">{values[section.key][field]}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </details>
  );
}

export function PlanProfileSection({ planId, profile, editable, copy, locale }: { planId: string; profile: BaPlanProfile; editable: boolean; copy: TeamCopy; locale: SupportedLocale }) {
  const { level, primaryDomain } = profile.personal;
  return (
    <div className="grid gap-4">
      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-navy">{copy.sections.personal}</h2>
        {editable ? (
          <form action={savePlanProfileAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Hidden planId={planId} />
            <label className="block min-w-0 text-sm font-semibold">{copy.fields.level}
              <select name="level" defaultValue={isLevel(level) ? level : ''} className={inputClass}>
                <option value="">{copy.goals.chooseLevel}</option>
                {baLevels.map((value) => <option key={value} value={value}>{levelLabels[locale][value]}</option>)}
              </select>
              {level && !isLevel(level) ? <span className="mt-1 block text-xs font-normal text-slate-500">{copy.goals.previousLevel}: {level}</span> : null}
            </label>
            <label className="block min-w-0 text-sm font-semibold">{copy.fields.primaryDomain}<input name="primaryDomain" maxLength={1500} defaultValue={primaryDomain} className={inputClass} /></label>
            <button className={buttonClass}>{copy.goals.saveProfile}</button>
          </form>
        ) : (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.fields.level}</dt><dd className="mt-1 break-words text-sm text-slate-800">{level ? levelText(level, locale) : '—'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.fields.primaryDomain}</dt><dd className="mt-1 break-words text-sm text-slate-800">{primaryDomain || '—'}</dd></div>
          </dl>
        )}
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-navy">{copy.goals.title}</h2>
        {editable ? <p className="mt-1 text-sm text-textSecondary">{copy.goals.hint}</p> : null}
        {profile.annualGoals.length ? (
          <ol className="mt-3 grid gap-3">
            {profile.annualGoals.map((goal, index) => (
              <li key={goal.key} className="rounded-xl border border-slate-200 p-3">
                <p className="break-words font-semibold text-navy"><span className="text-royalBlue">G{index + 1}.</span> {goal.title}</p>
                {goal.measure ? <p className="mt-1 break-words text-sm text-textSecondary"><span className="font-semibold">{copy.goals.measure}: </span>{goal.measure}</p> : null}
                {editable ? (
                  <details className="mt-2">
                    <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-royalBlue">{copy.okr.edit}</summary>
                    <form action={updateAnnualGoalAction} className="mt-2 grid gap-3">
                      <Hidden planId={planId} goalKey={goal.key} />
                      <GoalFields copy={copy} goal={goal} />
                      <button className={`${buttonClass} justify-self-start`}>{copy.goals.save}</button>
                    </form>
                    <form action={removeAnnualGoalAction} className="mt-3 grid gap-2 border-t border-slate-200 pt-3">
                      <Hidden planId={planId} goalKey={goal.key} />
                      <p className="text-xs text-slate-600">{copy.goals.removeHint}</p>
                      <button className={`${dangerButtonClass} justify-self-start`}>{copy.goals.remove}</button>
                    </form>
                  </details>
                ) : null}
              </li>
            ))}
          </ol>
        ) : <p className="mt-2 text-sm text-textSecondary">{copy.goals.none}</p>}
        {editable ? (profile.annualGoals.length < MAX_ANNUAL_GOALS ? (
          <form action={addAnnualGoalAction} className="mt-4 grid gap-3 rounded-xl border border-dashed border-slate-300 p-3">
            <Hidden planId={planId} />
            <GoalFields copy={copy} />
            <button className={`${buttonClass} justify-self-start`}>+ {copy.goals.add}</button>
          </form>
        ) : <p className="mt-3 text-sm text-textSecondary">{copy.goals.limit}</p>) : null}
      </section>

      {hasLegacyProfileContent(profile) ? <LegacySections profile={profile} copy={copy} locale={locale} /> : null}
    </div>
  );
}
