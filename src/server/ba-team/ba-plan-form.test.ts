import { describe, expect, it } from 'vitest';
import { annualOutcomesFromForm, kpiFromForm, prefixedEntries, profileFromForm } from './ba-plan-form';

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe('BA plan form parsing', () => {
  it('maps profile.<section>.<field> inputs onto the profile schema', () => {
    const profile = profileFromForm(form({ 'profile.personal.level': 'Middle', 'profile.roadmap.q2': 'Lead workshops', 'profile.capabilityFocus.AI_ASSISTED': 'Prompt library', planId: 'ignored' }));
    expect(profile.personal.level).toBe('Middle');
    expect(profile.roadmap.q2).toBe('Lead workshops');
    expect(profile.capabilityFocus.AI_ASSISTED).toBe('Prompt library');
    expect(profile.personal.primaryDomain).toBe('');
  });

  it('rejects unknown profile sections', () => {
    expect(() => profileFromForm(form({ 'profile.salary.amount': '1' }))).toThrow();
  });

  it('reads KPI inputs, dropping empty optional fields', () => {
    expect(kpiFromForm(form({ name: 'Rework', comparator: 'LTE', targetValue: '5', unitLabel: '%', description: ' ', templateId: '' }))).toEqual({ name: 'Rework', description: undefined, capabilityArea: undefined, comparator: 'LTE', targetValue: '5', unitLabel: '%', templateId: undefined });
  });

  it('collects prefixed entries and annual outcomes', () => {
    expect(prefixedEntries(form({ 'comment.k1': 'Good', other: 'x' }), 'comment.')).toEqual({ k1: 'Good' });
    expect(annualOutcomesFromForm(form({ 'outcome.a': 'ACHIEVED', 'outcomeComment.a': 'Solid', 'outcome.b': '' }))).toEqual({ a: { outcome: 'ACHIEVED', comment: 'Solid' } });
  });
});
