import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CanonicalJourney } from './canonical-journey-mapper';
import { SharedJourneyReader } from './SharedJourneyReader';

const journey: CanonicalJourney = {
  id: 'synthetic-journey',
  title: 'Synthetic Journey',
  stages: [
    { id: 'stage-a', title: 'Stage A', states: [{ id: 'purpose', title: 'Purpose', blocks: [{ id: 'purpose-copy', blockType: 'RICH_TEXT', payload: { text: 'Purpose copy' } }], children: [] }] },
    { id: 'stage-b', title: 'Stage B', states: [{ id: 'controls', title: 'Controls', blocks: [{ id: 'controls-list', blockType: 'CHECKLIST', payload: { items: ['Check'] } }], children: [] }] },
  ],
};

describe('SharedJourneyReader', () => {
  it('renders a non-payment canonical Journey with generic Previous and Next navigation', () => {
    const html = renderToStaticMarkup(<SharedJourneyReader journey={journey} activeStageId="stage-a" navigation={{ basePath: 'banking-journeys/synthetic-journey' }} />);
    expect(html).toContain('Stage 1 of 2');
    expect(html).toContain('id="state-purpose"');
    expect(html).toContain('Next: Stage B');
    expect(html).toContain('href="/banking-journeys/synthetic-journey?stage=stage-b"');
    expect(html).not.toContain('paymentType');
  });

  it('preserves Payments adapter query state through stage and Previous navigation', () => {
    const navigation = { basePath: 'banking-journeys/payments-and-transfers', preservedQueryParams: { paymentType: 'internal-transfer' } };
    const html = renderToStaticMarkup(<SharedJourneyReader journey={journey} activeStageId="stage-b" navigation={navigation} />);
    expect(html).toContain('href="/banking-journeys/payments-and-transfers?paymentType=internal-transfer&amp;stage=stage-a"');
    expect(html).toContain('← Previous: Stage A');
    expect(html).toContain('href="#state-controls"');
  });
});
