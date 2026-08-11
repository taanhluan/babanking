import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { JourneyBlockRenderer } from './JourneyBlockRenderer';
import type { JourneyBlockViewModel } from './journey-block-types';

const renderBlock = (blockType: string, payload: unknown) =>
  renderToStaticMarkup(<JourneyBlockRenderer block={{ blockType, payload }} />);

describe('JourneyBlockRenderer width semantics', () => {
  it.each(['RICH_TEXT', 'TEXT', 'PARAGRAPH'])(
    'uses a readable outer card for %s prose',
    (blockType) => {
      const markup = renderBlock(blockType, { text: 'Readable banking journey prose.' });
      expect(markup).toContain('data-block-layout="readable"');
      expect(markup).toContain('max-w-prose');
    },
  );

  it('uses a readable outer card for a prose callout', () => {
    const markup = renderBlock('CALLOUT', { title: 'Note', text: 'Readable guidance.' });
    expect(markup).toContain('data-block-layout="readable"');
    expect(markup).toContain('Readable guidance.');
  });

  it.each(['TABLE', 'DIAGRAM', 'FLOW', 'SEQUENCE', 'API_REFERENCE', 'CODE'])(
    'keeps %s content wide',
    (blockType) => {
      const payload = blockType === 'TABLE'
        ? { columns: ['Status'], rows: [['Posted']] }
        : blockType === 'DIAGRAM'
          ? { steps: ['Start', 'End'] }
          : { text: 'Structured content', steps: ['Start', 'End'] };
      const markup = renderBlock(blockType, payload);
      expect(markup).toContain('data-block-layout="wide"');
      expect(markup).toContain('max-w-full');
    },
  );

  it('keeps a business-process BPMN diagram wide', () => {
    const payload = {
      diagramType: 'business-process',
      lanes: [{ id: 'operations', name: 'Operations' }],
      nodes: [{ id: 'start', type: 'start-event', label: 'Start', laneId: 'operations' }],
      edges: [],
    };
    const markup = renderBlock('DIAGRAM', payload);
    expect(markup).toContain('data-block-layout="wide"');
    expect(markup).toContain('data-diagram-canvas');
  });

  it('classifies a textual wrapper resolved as BPMN by its effective diagram type', () => {
    const block: JourneyBlockViewModel = {
      blockType: 'RICH_TEXT',
      payload: {
        diagramType: 'business-process',
        lanes: [{ id: 'operations', name: 'Operations' }],
        nodes: [{ id: 'start', type: 'start-event', label: 'Start', laneId: 'operations' }],
        edges: [],
      },
    };
    const markup = renderToStaticMarkup(<JourneyBlockRenderer block={block} />);
    expect(markup).toContain('data-block-layout="wide"');
    expect(markup).toContain('data-diagram-canvas');
  });
});
