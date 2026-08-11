import { describe, expect, it } from 'vitest';
import { buildStageHref, deriveJourneyNavigation } from './journey-navigation';
import { isCanonicalStructuredJourneyContent, mapStructuredJourneyToCanonical } from './structured-journey-mapper';

const structured = {
  title: 'Customer Onboarding',
  slug: 'customer-onboarding',
  summary: 'A sufficiently detailed Customer Onboarding summary for canonical mapping.',
  metadata: { journeyReader: 'canonical' },
  modules: [
    { id: 'overview', title: 'Overview', sections: [{ id: 'goals', title: 'Goals', blocks: [{ id: 'goals', blockType: 'CHECKLIST', schemaVersion: 1, payload: { items: ['Open an account'] } }] }] },
    { id: 'capture', title: 'Capture customer data', sections: [{ id: 'purpose', title: 'Purpose and Details', blocks: [{ id: 'purpose', blockType: 'RICH_TEXT', schemaVersion: 1, payload: { text: 'Capture details.' } }] }] },
  ],
};

describe('structured Journey canonical mapping', () => {
  it('requires an explicit canonical marker and complete module/section/block structure', () => {
    expect(isCanonicalStructuredJourneyContent(structured)).toBe(true);
    expect(isCanonicalStructuredJourneyContent({ ...structured, metadata: {} })).toBe(false);
    expect(isCanonicalStructuredJourneyContent({ ...structured, modules: [{ title: 'Knowledge', sections: [] }] })).toBe(false);
  });

  it('maps non-Payments CMS structure into stable shared-reader navigation', () => {
    const journey = mapStructuredJourneyToCanonical(structured);
    expect(journey.stages.map((stage) => stage.id)).toEqual(['overview', 'capture']);
    expect(journey.stages[1].states[0].id).toBe('purpose');
    expect(journey.stages.flatMap((stage) => stage.states).flatMap((state) => state.blocks).map((block) => block.blockType))
      .toEqual(['CHECKLIST', 'RICH_TEXT']);
    const navigation = deriveJourneyNavigation(journey.stages);
    expect(buildStageHref({ basePath: 'banking-journeys/customer-onboarding' }, navigation[1].id, navigation[1].sections[0].id))
      .toBe('/banking-journeys/customer-onboarding?stage=capture#state-purpose');
  });
});
