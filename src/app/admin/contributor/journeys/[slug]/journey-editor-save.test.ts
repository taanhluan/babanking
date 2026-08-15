import { describe, expect, it } from 'vitest';
import { parseAdvancedJourneyText, resolveJourneyEditorSave } from './journey-editor-save';

const legacy = {
  title: 'Legacy Customer Service',
  summary: 'Legacy Customer Service summary long enough for the content schema.',
  schemaVersion: 1,
  modules: [{ title: 'Business Foundation', sections: [{ title: 'Overview', blocks: [] }] }],
};

const canonical = {
  title: 'Canonical Customer Service',
  summary: 'Canonical Customer Service summary long enough for the content schema.',
  schemaVersion: 1,
  metadata: { journeyReader: 'canonical' },
  modules: [{ title: 'Overview & Customer Service Scope', sections: [{ title: 'Purpose', blocks: [] }] }],
};

describe('Journey editor save payload', () => {
  it('submits the current Advanced JSON without requiring Apply JSON', () => {
    const advancedText = JSON.stringify(canonical, null, 2);
    const result = resolveJourneyEditorSave({ mode: 'advanced', content: legacy, advancedText });
    expect(result).toMatchObject({ ok: true, payload: { contentJson: advancedText, title: canonical.title } });
  });

  it('blocks syntactically invalid Advanced JSON', () => {
    expect(parseAdvancedJourneyText('{ invalid')).toEqual({ ok: false, error: 'Journey JSON must be valid JSON.' });
  });

  it('blocks schema-invalid Advanced JSON', () => {
    const result = parseAdvancedJourneyText(JSON.stringify({ title: 'Too short' }));
    expect(result).toEqual({ ok: false, error: 'Journey JSON does not match the required content schema.' });
  });

  it('continues to submit structured editor content', () => {
    const result = resolveJourneyEditorSave({ mode: 'business', content: legacy, advancedText: JSON.stringify(canonical) });
    expect(result).toMatchObject({ ok: true, payload: { contentJson: JSON.stringify(legacy), title: legacy.title } });
  });

  it('preserves the canonical reader marker in the submitted Advanced payload', () => {
    const result = resolveJourneyEditorSave({ mode: 'advanced', content: legacy, advancedText: JSON.stringify(canonical) });
    expect(result.ok && JSON.parse(result.payload.contentJson).metadata.journeyReader).toBe('canonical');
  });

  it('never replaces current Advanced JSON with stale legacy parent content', () => {
    const result = resolveJourneyEditorSave({ mode: 'advanced', content: legacy, advancedText: JSON.stringify(canonical) });
    expect(result.ok && result.payload.contentJson).toBe(JSON.stringify(canonical));
    expect(result.ok && result.payload.contentJson).not.toBe(JSON.stringify(legacy));
  });
});
