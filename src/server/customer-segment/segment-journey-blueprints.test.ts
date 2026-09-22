import { describe, expect, it } from 'vitest';
import { buildSegmentJourneyDraftContent, segmentJourneyBlueprints } from './segment-journey-blueprints';

describe('segment Journey blueprints', () => {
  it('defines ten unique drafts for SME and Enterprise without Retail identities', () => {
    const slugs = segmentJourneyBlueprints.map((item) => item.slug);
    expect(segmentJourneyBlueprints.filter((item) => item.segment === 'sme')).toHaveLength(10);
    expect(segmentJourneyBlueprints.filter((item) => item.segment === 'enterprise-banking')).toHaveLength(10);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => slug.startsWith('sme-') || slug.startsWith('enterprise-'))).toBe(true);
  });

  it('builds valid canonical initial drafts with segment metadata and BA structure', () => {
    for (const blueprint of segmentJourneyBlueprints) {
      const content = buildSegmentJourneyDraftContent(blueprint);
      expect(content.slug).toBe(blueprint.slug);
      expect(content.metadata?.customerSegment).toBe(blueprint.segment);
      expect(content.modules).toHaveLength(3);
      expect(content.modules?.map((module) => module.title)).toEqual(['Overview & Scope', 'Lifecycle Stages', 'Business Analysis']);
    }
  });
});
