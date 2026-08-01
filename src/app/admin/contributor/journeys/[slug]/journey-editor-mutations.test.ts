import { describe, expect, it } from 'vitest';
import { journeyContentSchema } from '@/server/cms/journey-content-schema';
import { addJourneyBlock, duplicateJourneyBlock, moveJourneySection, removeJourneyBlock } from './journey-editor-mutations';

const draft = journeyContentSchema.parse({ title: 'Payments and Transfers', summary: 'A sufficiently long journey summary for mutation tests.', schemaVersion: 1, modules: [{ key: 'internal-transfer', title: 'Internal Transfer', sections: [{ key: 'initiation', title: 'Initiation', blocks: [{ blockType: 'RICH_TEXT', schemaVersion: 1, payload: { title: 'Purpose', text: 'Start' } }] }, { title: 'Validation', blocks: [] }] }] });

describe('journey editor mutations', () => {
  it('adds a schema-valid block without mutating the input', () => {
    const result = addJourneyBlock(draft, 0, 0);
    expect(result.ok).toBe(true);
    expect(draft.modules?.[0].sections[0].blocks).toHaveLength(1);
    expect(result.content.modules?.[0].sections[0].blocks).toHaveLength(2);
    expect(journeyContentSchema.parse(result.content)).toBeTruthy();
  });

  it('duplicates payloads deeply', () => {
    const result = duplicateJourneyBlock(draft, { moduleIndex: 0, sectionIndex: 0, blockIndex: 0 });
    expect(result.ok).toBe(true);
    result.content.modules![0].sections[0].blocks[1].payload.text = 'Changed';
    expect(result.content.modules![0].sections[0].blocks[0].payload.text).toBe('Start');
  });

  it('moves sections and removes blocks with safe paths', () => {
    const moved = moveJourneySection(draft, 0, 0, 'down');
    expect(moved.selectedPath).toEqual({ moduleIndex: 0, sectionIndex: 1 });
    const removed = removeJourneyBlock(draft, { moduleIndex: 0, sectionIndex: 0, blockIndex: 0 });
    expect(removed.selectedPath).toEqual({ moduleIndex: 0, sectionIndex: 0 });
  });
});
