import { describe, expect, it } from 'vitest';
import { journeyContentSchema } from '@/server/cms/journey-content-schema';
import { addJourneyBlock, addJourneySubsection, duplicateJourneyBlock, moveJourneySection, removeJourneyBlock, updateJourneyBlockType, updateJourneyModuleMedia, updateJourneySectionMedia, updateJourneySubsectionMedia } from './journey-editor-mutations';

const draft = journeyContentSchema.parse({ title: 'Payments and Transfers', summary: 'A sufficiently long journey summary for mutation tests.', schemaVersion: 1, modules: [{ key: 'internal-transfer', title: 'Internal Transfer', sections: [{ key: 'initiation', title: 'Initiation', blocks: [{ blockType: 'RICH_TEXT', schemaVersion: 1, payload: { title: 'Purpose', text: 'Start' } }] }, { title: 'Validation', blocks: [] }] }] });

describe('journey editor mutations', () => {
  it('creates a v2 subsection without changing legacy sections', () => {
    const result = addJourneySubsection(draft, 0, 0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.content.schemaVersion).toBe(2);
      expect(result.content.modules?.[0].sections[0].subsections?.[0].title).toBe('New Subsection');
    }
  });
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

  it('uses schema-safe mutations for IMAGE blocks and the three cover-image levels', () => {
    const image = updateJourneyBlockType(draft, { moduleIndex: 0, sectionIndex: 0, blockIndex: 0 }, 'IMAGE');
    expect(image.ok).toBe(true);
    expect(image.content.modules?.[0].sections[0].blocks[0]).toMatchObject({
      blockType: 'IMAGE',
      payload: { title: 'Purpose' },
    });

    const moduleMedia = updateJourneyModuleMedia(draft, 0, { kind: 'IMAGE', alt: 'Module cover', url: 'https://example.com/module.png' });
    expect(moduleMedia.ok).toBe(true);
    const sectionMedia = updateJourneySectionMedia(moduleMedia.content, 0, 0, { kind: 'IMAGE', alt: 'Section cover', url: 'https://example.com/section.png' });
    expect(sectionMedia.ok).toBe(true);
    const subsection = addJourneySubsection(sectionMedia.content, 0, 0);
    expect(subsection.ok).toBe(true);
    const subsectionMedia = updateJourneySubsectionMedia(subsection.content, 0, 0, 0, { kind: 'IMAGE', alt: 'Subsection cover', url: 'https://example.com/subsection.png' });
    expect(subsectionMedia.ok).toBe(true);
    expect(subsectionMedia.content.modules?.[0].media).toMatchObject({ alt: 'Module cover' });
    expect(subsectionMedia.content.modules?.[0].sections[0].media).toMatchObject({ alt: 'Section cover' });
    expect(subsectionMedia.content.modules?.[0].sections[0].subsections?.[0].media)
      .toMatchObject({ alt: 'Subsection cover' });
  });
});
