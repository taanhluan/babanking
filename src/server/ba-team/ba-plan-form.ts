import { baPlanProfileSchema, managerNotesSchema, type BaPlanProfile, type ManagerNotes } from './ba-plan-domain';

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === 'string' ? entry : undefined;
}

function optional(formData: FormData, name: string) {
  const entry = value(formData, name)?.trim();
  return entry ? entry : undefined;
}

/** Reads `profile.<section>.<field>` inputs into a validated plan profile; unknown sections are rejected. */
export function profileFromForm(formData: FormData): BaPlanProfile {
  const profile: Record<string, Record<string, string>> = {};
  for (const [key, entry] of formData.entries()) {
    if (!key.startsWith('profile.') || typeof entry !== 'string') continue;
    const [, section, field] = key.split('.');
    if (!section || !field) continue;
    (profile[section] ??= {})[field] = entry;
  }
  return baPlanProfileSchema.parse({ schemaVersion: 1, ...profile });
}

export function kpiFromForm(formData: FormData) {
  return {
    name: value(formData, 'name') ?? '',
    description: optional(formData, 'description'),
    capabilityArea: optional(formData, 'capabilityArea'),
    comparator: value(formData, 'comparator') ?? '',
    targetValue: value(formData, 'targetValue') ?? '',
    unitLabel: value(formData, 'unitLabel') ?? '',
    templateId: optional(formData, 'templateId'),
  };
}

export function progressFromForm(formData: FormData) {
  return { actualValue: value(formData, 'actualValue') ?? '', note: optional(formData, 'note'), evidenceUrl: optional(formData, 'evidenceUrl') };
}

export function managerNotesFromForm(formData: FormData): ManagerNotes {
  return managerNotesSchema.parse({
    recommendation: value(formData, 'recommendation') ?? '',
    reviewPoint: value(formData, 'reviewPoint') ?? '',
    promotionReadiness: value(formData, 'promotionReadiness') ?? '',
  });
}

/** Reads `prefix<id>` inputs, e.g. `comment.<kpiId>` or `outcome.<lineageKey>`. */
export function prefixedEntries(formData: FormData, prefix: string) {
  const result: Record<string, string> = {};
  for (const [key, entry] of formData.entries()) if (key.startsWith(prefix) && typeof entry === 'string') result[key.slice(prefix.length)] = entry;
  return result;
}

export function annualOutcomesFromForm(formData: FormData) {
  const outcomes = prefixedEntries(formData, 'outcome.');
  const comments = prefixedEntries(formData, 'outcomeComment.');
  return Object.fromEntries(Object.entries(outcomes).filter(([, outcome]) => outcome).map(([key, outcome]) => [key, { outcome, comment: comments[key] ?? '' }]));
}
