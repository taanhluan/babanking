import { describe, expect, it } from 'vitest';
import { LIFECYCLE_ALIASES, mapJourneyPortal } from './journey-portal-mapper';
import type { PublishedContent } from '@/lib/repository';

const content = (body: Record<string, unknown>): PublishedContent => ({ id: '1', type: 'BANKING_JOURNEY', slug: 'payments-and-transfers', title: 'Payments', summary: 'A sufficiently long journey summary for mapper tests.', body });

describe('mapJourneyPortal', () => {
  it('maps CMS modules, sections, and blocks in order', () => {
    const result = mapJourneyPortal(content({ modules: [{ key: LIFECYCLE_ALIASES[0], title: 'Payment Lifecycle', sections: [{ title: 'Initiation', blocks: [{ id: 'b', blockType: 'TABLE', schemaVersion: 1, payload: { rows: [] } }] }] }, { title: 'Rules', sections: [{ title: 'Controls', blocks: [{ blockType: 'UNKNOWN', payload: { value: 1 } }] }] }] }));
    expect(result.source.lifecycle).toBe('cms');
    expect(result.lifecycle[0].states[0].blocks[0].blockType).toBe('TABLE');
    expect(result.existingKnowledge[0].title).toBe('Controls');
  });
  it('recognizes approved end-to-end alias but not unrelated modules', () => {
    expect(mapJourneyPortal(content({ modules: [{ title: 'End-to-End Business Process', sections: [] }] })).source.lifecycle).toBe('cms');
    expect(mapJourneyPortal(content({ modules: [{ title: 'Unrelated Notes', sections: [] }] })).source.lifecycle).toBe('compatibility-fallback');
  });
  it('maps nested states recursively and preserves parent blocks', () => {
    const result = mapJourneyPortal(content({ modules: [{ key: 'payment-lifecycle', title: 'Lifecycle', sections: [{ title: 'Initiation', blocks: [{ id: 'parent', blockType: 'RICH_TEXT', payload: { title: 'Parent' }, children: [{ id: 'child', blockType: 'CALLOUT', payload: { title: 'Child' }, children: [{ id: 'grandchild', blockType: 'CODE', payload: { text: 'x' } }] }] }] }] }] }));
    expect(result.lifecycle[0].states[0].blocks).toHaveLength(1);
    expect(result.lifecycle[0].states[0].children[0].children[0].title).toBe('grandchild');
  });
  it('uses fallback only when lifecycle is absent', () => {
    expect(mapJourneyPortal(content({})).usedCompatibilityFallback).toBe(true);
    expect(mapJourneyPortal(content({ modules: [{ key: 'payment-lifecycle', title: 'Lifecycle', sections: [{ title: 'One', blocks: [] }] }] })).usedCompatibilityFallback).toBe(false);
  });
  it('normalizes IDs and resolves duplicate state IDs', () => {
    const result = mapJourneyPortal(content({ modules: [{ key: 'payment-lifecycle', title: 'Lifecycle', sections: [{ title: 'Initiation', blocks: [{ id: 'same', blockType: 'RICH_TEXT', payload: { title: 'A' } }, { id: 'same', blockType: 'RICH_TEXT', payload: { title: 'A' } }] }] }] }));
    expect(result.lifecycle[0].id).toBe('initiation');
    expect(result.lifecycle[0].states.map((state) => state.id)).toEqual(['same', 'same-2']);
  });
  it('preserves unknown blocks and related journeys without throwing', () => {
    const result = mapJourneyPortal(content({ relatedJourneySlugs: ['onboarding'], modules: [{ title: 'Knowledge', sections: [{ title: 'Notes', blocks: [{ blockType: 'FUTURE_BLOCK', payload: null }] }] }] }));
    expect(result.existingKnowledge[0].blocks[0].blockType).toBe('FUTURE_BLOCK');
    expect(result.relatedJourneys).toEqual(['onboarding']);
  });
  it('handles empty sections and malformed optional values', () => {
    expect(() => mapJourneyPortal(content({ modules: [{ key: 'payment-lifecycle', title: 'Lifecycle', sections: [{ title: 'Empty' }] }] }))).not.toThrow();
  });
  it('selects Payment Type mode only when Published content has recognized Payment Types', () => {
    const result = mapJourneyPortal(content({ modules: [{ key: 'internal-transfer', title: 'Internal Transfer', sections: [] }] }));
    expect(result.mode).toBe('PAYMENT_TYPE_PORTAL');
    expect(result.contentReadiness).toEqual({ hasPaymentTypes: true, paymentTypeCount: 1, recognizedPaymentTypeKeys: ['internal-transfer'], legacyModuleCount: 0 });
  });
  it('keeps payment aliases and compatibility fallback owned by the Payments facade', () => {
    const result = mapJourneyPortal(content({ modules: [{ key: 'internal-transfer', title: 'Internal Transfer', sections: [{ key: 'initiation', title: 'Initiation', blocks: [] }] }] }));
    expect(result.paymentTypeGroups[0].paymentTypes[0]).toMatchObject({ id: 'internal-transfer', slug: 'internal-transfer', title: 'Internal Transfer' });
    expect(result.paymentTypeGroups.flatMap((group) => group.paymentTypes).some((payment) => payment.slug === 'top-up')).toBe(true);
  });
  it('selects Legacy Published Content mode without fabricating Payment Types', () => {
    const result = mapJourneyPortal(content({ modules: [{ title: 'Business Overview', sections: [{ title: 'Overview', blocks: [] }] }] }));
    expect(result.mode).toBe('LEGACY_PUBLISHED_CONTENT');
    expect(result.contentReadiness.hasPaymentTypes).toBe(false);
    expect(result.paymentTypeGroups.length).toBeGreaterThan(0);
    expect(result.legacyModules[0].title).toBe('Business Overview');
  });
  it('normalizes valid business-process data from legacy wrappers without rewriting JSON', () => {
    const diagram = {
      diagramType: 'business-process', orientation: 'horizontal',
      lanes: [{ id: 'customer', name: 'Customer' }],
      nodes: [{ id: 'start', type: 'start-event', label: 'Start', laneId: 'customer' }],
      edges: [],
    };
    const result = mapJourneyPortal(content({ modules: [{ key: 'internal-transfer', title: 'Internal Transfer', sections: [{ title: 'Initiation', blocks: [
      { id: 'nested', blockType: 'RICH_TEXT', payload: { title: 'Flow', description: 'Metadata only', ...diagram } },
      { id: 'top-level', blockType: 'RICH_TEXT', payload: { title: 'Legacy Flow', description: 'Metadata only' }, ...diagram },
    ] }] }] }));
    const blocks = result.paymentTypeGroups[0].paymentTypes[0].lifecycle[0].states.flatMap((state) => state.blocks);

    expect(blocks.map((entry) => entry.blockType)).toEqual(['DIAGRAM', 'DIAGRAM']);
    expect(blocks.map((entry) => (entry.payload as Record<string, unknown>).diagramType)).toEqual(['business-process', 'business-process']);
    expect((blocks[1].payload as Record<string, unknown>).nodes).toEqual(diagram.nodes);
  });
});
