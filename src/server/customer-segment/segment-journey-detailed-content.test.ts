import { describe, expect, it } from 'vitest';
import { isCanonicalStructuredJourneyContent, mapStructuredJourneyToCanonical } from '@/components/journeys/structured-journey-mapper';
import { segmentJourneyBlueprints } from './segment-journey-blueprints';
import { buildSegmentJourneyDetailedContent } from './segment-journey-detailed-content';

describe('detailed segment Journey content', () => {
  it('builds deep, valid, deterministic content for every Phase 2 identity', () => {
    for (const blueprint of segmentJourneyBlueprints) {
      const first = buildSegmentJourneyDetailedContent(blueprint);
      const second = buildSegmentJourneyDetailedContent(blueprint);
      const sections = first.modules!.flatMap((module) => module.sections);
      const blocks = sections.flatMap((section) => section.blocks);
      expect(first).toEqual(second);
      expect(first.slug).toBe(blueprint.slug);
      expect(first.modules).toHaveLength(13);
      expect(sections.length).toBeGreaterThanOrEqual(60);
      expect(blocks.length).toBe(sections.length);
      expect(new Set(blocks.map((block) => block.blockType))).toEqual(new Set(['RICH_TEXT', 'TABLE', 'CHECKLIST', 'CALLOUT', 'DIAGRAM']));
      const ids = [...first.modules!.map((module) => module.id), ...sections.map((section) => section.id), ...blocks.map((block) => block.id)];
      expect(new Set(ids).size).toBe(ids.length);
      expect(first.metadata).toMatchObject({ customerSegment: blueprint.segment, maturity: 'detailed-draft' });
      expect(isCanonicalStructuredJourneyContent(first)).toBe(true);
      const readerModel = mapStructuredJourneyToCanonical(first);
      expect(readerModel.stages).toHaveLength(13);
      expect(readerModel.stages.reduce((count, stage) => count + stage.states.length, 0)).toBe(sections.length);
    }
  });
});
