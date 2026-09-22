import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { JourneyBlockRenderer } from './JourneyBlockRenderer';
import type { JourneyBlockViewModel } from './journey-block-types';

const renderBlock = (blockType: string, payload: unknown) =>
  renderToStaticMarkup(<JourneyBlockRenderer block={{ blockType, payload }} />);

describe('JourneyBlockRenderer width semantics', () => {
  it('renders approved image and diagram uploads with accessible metadata', () => {
    const imageMarkup = renderBlock('IMAGE', {
      url: 'data:image/png;base64,aGVsbG8=',
      title: 'Identity evidence',
      alt: 'A customer identity document',
      caption: 'Accepted document example.',
    });
    const diagramMarkup = renderBlock('DIAGRAM', {
      url: 'https://cdn.example.com/onboarding-flow.png',
      title: 'Onboarding flow',
    });

    expect(imageMarkup).toContain('alt="A customer identity document"');
    expect(imageMarkup).toContain('Identity evidence');
    expect(imageMarkup).toContain('Accepted document example.');
    expect(diagramMarkup).toContain('https://cdn.example.com/onboarding-flow.png');
  });

  it('does not render an untrusted image source', () => {
    const markup = renderBlock('IMAGE', { url: 'javascript:alert(1)' });
    expect(markup).not.toContain('javascript:');
    expect(markup).not.toContain('<img');
  });

  it('preserves published CODE payloads before diagram hydration', () => {
    const markup = renderBlock('CODE', { title: 'Business flow', language: 'mermaid', code: 'flowchart TB\n A-->B' });
    expect(markup).toContain('Business flow');
    expect(markup).toContain('flowchart TB');
  });
  it.each(['RICH_TEXT', 'TEXT', 'PARAGRAPH'])(
    'uses a full-width card with readable inner text for %s prose',
    (blockType) => {
      const markup = renderBlock(blockType, { text: 'Readable banking journey prose.' });
      expect(markup).toContain('data-block-layout="readable"');
      expect(markup).toContain('max-w-prose');
      expect(markup).toMatch(/^<div[^>]*class="[^"]*w-full max-w-full/);
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
