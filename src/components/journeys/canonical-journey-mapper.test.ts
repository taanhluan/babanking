import { describe, expect, it } from 'vitest';
import {
  mapCanonicalJourney,
  normalizeCanonicalBlock,
  type CanonicalJourneySource,
} from './canonical-journey-mapper';

describe('canonical Journey normalization', () => {
  it('creates deterministic unique stage and state IDs while preserving source order', () => {
    const source = {
      title: 'Customer Onboarding',
      stages: [
        {
          title: 'Capture customer data',
          blocks: [
            { id: 'purpose', blockType: 'RICH_TEXT', payload: { title: 'Purpose', text: 'Capture details.' } },
            { id: 'purpose', blockType: 'CHECKLIST', payload: { title: 'Checks', items: ['Consent'] } },
          ],
        },
        { title: 'Capture customer data', blocks: [] },
      ],
    } satisfies CanonicalJourneySource;

    const first = mapCanonicalJourney(source);
    const second = mapCanonicalJourney(source);

    expect(first).toEqual(second);
    expect(first.stages.map((stage) => stage.id)).toEqual(['capture-customer-data', 'capture-customer-data-2']);
    expect(first.stages[0].states.map((state) => state.id)).toEqual(['purpose', 'purpose-2']);
    expect(first.stages.map((stage) => stage.title)).toEqual(['Capture customer data', 'Capture customer data']);
  });

  it('normalizes nested children/states and block title and summary fields', () => {
    const result = mapCanonicalJourney({
      title: 'Generic Journey',
      stages: [{
        key: 'review', title: 'Review', summary: 'Review the request.', blocks: [{
          key: 'initial-review', blockType: 'CALLOUT', payload: { title: 'Initial review', description: 'Check completeness.' },
          children: [{ key: 'enhanced-review', blockType: 'CHECKLIST', payload: { title: 'Enhanced review', items: ['EDD'] } }],
        }],
      }],
    });

    expect(result.stages[0]).toMatchObject({ id: 'review', title: 'Review', summary: 'Review the request.' });
    expect(result.stages[0].states[0]).toMatchObject({ id: 'initial-review', title: 'Initial review', summary: 'Check completeness.' });
    expect(result.stages[0].states[0].children[0]).toMatchObject({ id: 'enhanced-review', title: 'Enhanced review' });
  });

  it('resolves valid business-process data to an effective DIAGRAM block', () => {
    const block = normalizeCanonicalBlock({
      id: 'process',
      blockType: 'RICH_TEXT',
      payload: {
        diagramType: 'business-process',
        lanes: [{ id: 'operations', name: 'Operations' }],
        nodes: [{ id: 'start', laneId: 'operations' }],
        edges: [],
      },
    }, 'fallback');

    expect(block.blockType).toBe('DIAGRAM');
    expect((block.payload as Record<string, unknown>).diagramType).toBe('business-process');
  });

  it('preserves generic business-process metadata without semantic mutation', () => {
    const payload = {
      diagramType: 'business-process',
      orientation: 'horizontal',
      title: 'Generic business process',
      description: 'A generic governed process.',
      scope: {
        journey: 'Generic Journey',
        supportedChannels: ['Digital', 'Assisted'],
        nested: { outcomes: ['Completed', 'Rejected'] },
      },
      lanes: [{ id: 'operations', name: 'Operations' }],
      nodes: [{ id: 'start', type: 'start-event', laneId: 'operations' }],
      edges: [],
      businessRules: [
        { id: 'RULE-1', rule: 'The request must be eligible.' },
        { id: 'RULE-2', rule: 'Approval evidence must be retained.' },
      ],
      validationCategories: ['Eligibility', 'Approval'],
      successOutcome: { state: 'COMPLETED', evidence: { required: true } },
    };

    const block = normalizeCanonicalBlock({
      id: 'generic-process',
      blockType: 'DIAGRAM',
      payload,
    }, 'fallback');

    expect(block.blockType).toBe('DIAGRAM');
    expect(block.payload).toEqual(payload);
    expect((block.payload as Record<string, unknown>).scope).toEqual(payload.scope);
    expect((block.payload as Record<string, unknown>).businessRules).toEqual(payload.businessRules);
    expect((block.payload as Record<string, unknown>).validationCategories).toEqual(payload.validationCategories);
    expect((block.payload as Record<string, unknown>).successOutcome).toEqual(payload.successOutcome);
  });

  it('does not alter non-DIAGRAM canonical block payloads', () => {
    const payload = { title: 'Review note', text: 'Keep this content unchanged.', scope: { owner: 'Operations' } };
    expect(normalizeCanonicalBlock({ id: 'note', blockType: 'CALLOUT', payload }, 'fallback')).toMatchObject({
      blockType: 'CALLOUT',
      payload,
    });
  });

  it('represents actual legacy Onboarding fields without payment metadata, a new renderer, or schema fields', () => {
    const onboarding = {
      businessOverview: 'Customer onboarding connects customer intent with operations and controls.',
      customerGoals: ['Become an approved customer', 'Understand the outcome'],
      businessGoals: ['Deliver onboarding consistently', 'Control operational risk'],
      keyActors: ['Customer', 'Relationship Manager', 'KYC Analyst', 'Operations'],
      channels: ['Mobile and web banking'],
      systems: ['Mobile and web banking', 'CRM', 'KYC platform', 'Core banking'],
      capabilities: ['Customer Registration', 'Identity Verification', 'KYC', 'Account Opening'],
      processSteps: [
        { title: 'Capture customer data', description: 'Confirm inputs and ownership.' },
        { title: 'Verify identity', description: 'Confirm inputs and ownership.' },
        { title: 'Screen and assess risk', description: 'Confirm inputs and ownership.' },
        { title: 'Approve and open account', description: 'Confirm inputs and ownership.' },
      ],
      businessRules: [{ title: 'Illustrative rule 1', description: 'Required documents vary by customer type.' }],
      dataEntities: ['Customer', 'Account', 'Request', 'Status'],
      risksAndControls: [{ risk: 'Identity fraud', control: 'Define preventive checks.' }],
      commonExceptions: ['Information is incomplete'],
      baQuestions: ['What outcome defines success?'],
      baOutputs: ['Journey map'],
    };
    const source = {
      title: 'Customer Onboarding',
      summary: onboarding.businessOverview,
      stages: onboarding.processSteps.map((step) => ({
        title: step.title,
        blocks: [{ blockType: 'RICH_TEXT', payload: { title: 'Purpose', text: step.description } }],
      })),
    } satisfies CanonicalJourneySource;
    const fieldRepresentation = {
      businessOverview: 'RICH_TEXT', customerGoals: 'CHECKLIST', businessGoals: 'CHECKLIST', keyActors: 'CHECKLIST',
      channels: 'CHECKLIST', systems: 'CHECKLIST', capabilities: 'CHECKLIST', processSteps: 'RICH_TEXT',
      businessRules: 'TABLE', dataEntities: 'CHECKLIST', risksAndControls: 'TABLE', commonExceptions: 'CHECKLIST',
      baQuestions: 'CHECKLIST', baOutputs: 'CHECKLIST',
    };

    expect(Object.keys(fieldRepresentation)).toEqual(Object.keys(onboarding));
    expect(new Set(Object.values(fieldRepresentation))).toEqual(new Set(['RICH_TEXT', 'CHECKLIST', 'TABLE']));
    expect(mapCanonicalJourney(source).stages.map((stage) => stage.title)).toEqual(onboarding.processSteps.map((step) => step.title));
    expect(source).not.toHaveProperty('paymentType');
  });
});
