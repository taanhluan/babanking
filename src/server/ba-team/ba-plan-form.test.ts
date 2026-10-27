import { describe, expect, it } from 'vitest';
import { annualGoalFromForm, annualOutcomesFromForm, kpiFromForm, prefixedEntries, profileFromForm } from './ba-plan-form';

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe('BA plan form parsing', () => {
  it('reads the profile basics and one annual goal', () => {
    expect(profileFromForm(form({ level: 'MIDDLE', primaryDomain: 'Lending', planId: 'ignored' }))).toEqual({ level: 'MIDDLE', primaryDomain: 'Lending' });
    expect(annualGoalFromForm(form({ title: 'Raise specification quality', measure: 'First-pass ≥ 90%' }))).toEqual({ title: 'Raise specification quality', measure: 'First-pass ≥ 90%' });
  });

  it('reads KPI inputs, dropping empty optional fields', () => {
    expect(kpiFromForm(form({ name: 'Rework', comparator: 'LTE', targetValue: '5', unitLabel: '%', description: ' ', templateId: '' }))).toEqual({ name: 'Rework', description: undefined, capabilityArea: undefined, comparator: 'LTE', targetValue: '5', unitLabel: '%', templateId: undefined, objectiveId: undefined });
  });

  it('collects prefixed entries and annual outcomes', () => {
    expect(prefixedEntries(form({ 'comment.k1': 'Good', other: 'x' }), 'comment.')).toEqual({ k1: 'Good' });
    expect(annualOutcomesFromForm(form({ 'outcome.a': 'ACHIEVED', 'outcomeComment.a': 'Solid', 'outcome.b': '' }))).toEqual({ a: { outcome: 'ACHIEVED', comment: 'Solid' } });
  });
});
