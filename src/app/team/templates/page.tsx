import { saveTemplateAction } from '@/app/team/actions';
import { KpiFields } from '@/components/team/KpiFields';
import { Badge, ResultBanner, TeamNav, buttonClass, cardClass, inputClass } from '@/components/team/TeamShell';
import { capabilityAreaLabels, teamCopy } from '@/components/team/team-copy';
import { WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { getCurrentLocale } from '@/i18n/server';
import { formatTarget, type CapabilityArea } from '@/server/ba-team/ba-plan-domain';
import { BaPlanRepository } from '@/server/ba-team/ba-plan-repository';
import { requireBaTeamLead } from '@/server/ba-team/ba-team-access';

export default async function TeamTemplatesPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  await requireBaTeamLead('/team/templates');
  const [params, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const copy = teamCopy[locale];
  const templates = await BaPlanRepository.listTemplates();
  return (
    <>
      <TeamNav active="templates" isLead />
      <WorkspaceTitle eyebrow={copy.area} title={copy.templatesTitle} description={copy.templatesDescription} />
      <ResultBanner error={params.error} saved={params.saved} savedLabel={copy.saved} />
      <details className={`${cardClass} mb-5`}>
        <summary className="min-h-11 cursor-pointer content-center font-semibold text-royalBlue">{copy.newTemplate}</summary>
        <form action={saveTemplateAction} className="mt-3 grid gap-3">
          <KpiFields copy={copy} locale={locale} requireArea />
          <button className={`${buttonClass} justify-self-start`}>{copy.saveTemplate}</button>
        </form>
      </details>
      <div className="grid gap-3">
        {templates.map((template) => (
          <details key={template.id} className={cardClass}>
            <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2">
              <span><span className="font-semibold text-navy">{template.name}</span> <span className="text-sm text-textSecondary">{formatTarget(template.comparator, template.defaultTarget, template.unitLabel)}</span><span className="block text-xs text-slate-500">{capabilityAreaLabels[locale][template.capabilityArea as CapabilityArea] ?? template.capabilityArea}</span></span>
              <Badge>{template.isActive ? copy.active : copy.inactive}</Badge>
            </summary>
            <form action={saveTemplateAction} className="mt-3 grid gap-3">
              <input type="hidden" name="templateId" value={template.id} />
              <KpiFields copy={copy} locale={locale} requireArea values={{ ...template, targetValue: template.defaultTarget }} />
              <label className="block min-w-0 text-sm font-semibold sm:w-60">{copy.status}<select name="isActive" defaultValue={String(template.isActive)} className={inputClass}><option value="true">{copy.active}</option><option value="false">{copy.inactive}</option></select></label>
              <button className={`${buttonClass} justify-self-start`}>{copy.saveTemplate}</button>
            </form>
          </details>
        ))}
      </div>
    </>
  );
}
