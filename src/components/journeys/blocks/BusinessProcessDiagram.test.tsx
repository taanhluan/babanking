import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { JourneyBlockRenderer } from './JourneyBlockRenderer';

function elementAttribute(markup: string, selectorAttribute: string, selectorValue: string, attribute: string) {
  const element = markup.match(new RegExp(`<[^>]+${selectorAttribute}="${selectorValue}"[^>]*>`))?.[0];
  const value = element?.match(new RegExp(`(?:^|\\s)${attribute}="([^"]+)"`))?.[1];
  if (value === undefined) throw new Error(`Missing ${attribute} on ${selectorAttribute}=${selectorValue}`);
  return value;
}

function elementBounds(markup: string, selectorAttribute: string, selectorValue: string, prefix: string) {
  return {
    left: Number(elementAttribute(markup, selectorAttribute, selectorValue, `${prefix}-left`)),
    right: Number(elementAttribute(markup, selectorAttribute, selectorValue, `${prefix}-right`)),
    top: Number(elementAttribute(markup, selectorAttribute, selectorValue, `${prefix}-top`)),
    bottom: Number(elementAttribute(markup, selectorAttribute, selectorValue, `${prefix}-bottom`)),
  };
}

function intersects(left: ReturnType<typeof elementBounds>, right: ReturnType<typeof elementBounds>) {
  return left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top;
}

describe('JourneyBlockRenderer business process diagrams', () => {
  it('renders structured business-process payloads as a swimlane workflow', () => {
    const block = {
      id: 'diagram-1',
      blockType: 'DIAGRAM',
      payload: {
        title: 'Internal Transfer – General Business Process Flow',
        diagramType: 'business-process',
        lanes: [
          { id: 'customer', name: 'Customer / Initiating User' },
          { id: 'channel', name: 'Digital Banking Channel' },
        ],
        nodes: [
          { id: 'start', type: 'start-event', label: 'Internal transfer initiated', laneId: 'customer' },
          { id: 'select-source', type: 'user-task', label: 'Select source account', laneId: 'customer' },
          { id: 'decision', type: 'decision-gateway', label: 'Select transfer variant', laneId: 'customer' },
          { id: 'validate', type: 'service-task', label: 'Validate transfer details', laneId: 'channel' },
          { id: 'end', type: 'end-event', label: 'Ready for review', laneId: 'channel' },
        ],
        edges: [
          { id: 'edge-1', source: 'start', target: 'select-source' },
          { id: 'edge-2', source: 'select-source', target: 'decision' },
          { id: 'edge-3', source: 'decision', target: 'validate', condition: 'Variant selected' },
          { id: 'edge-4', source: 'validate', target: 'end', condition: 'Valid' },
        ],
      },
    };

    const markup = renderToStaticMarkup(<JourneyBlockRenderer block={block} />);
    expect(markup).toContain('Internal Transfer – General Business Process Flow');
    expect(markup).toContain('Customer / Initiating User');
    expect(markup).toContain('Select source account');
    expect(markup).toContain('Variant selected');
    expect(markup).toContain('data-edge-id="edge-3"');
    expect(markup).toContain('Accessible summary');
    expect(markup).toContain('min-w-0 max-w-full overflow-hidden rounded-xl');
    expect(markup).toContain('w-full min-w-0 max-w-full overflow-hidden rounded-2xl');
    expect(markup).toContain('data-diagram-scroll="true" class="mt-4 w-full min-w-0 overflow-x-auto overflow-y-hidden');
    expect(markup).toContain('data-lane-label="customer" class="sticky left-0 z-30');

    const canvasWidth = Number(elementAttribute(markup, 'data-diagram-canvas', 'true', 'data-canvas-width'));
    const leftPadding = Number(elementAttribute(markup, 'data-diagram-canvas', 'true', 'data-left-process-padding'));
    const rightPadding = Number(elementAttribute(markup, 'data-diagram-canvas', 'true', 'data-right-process-padding'));
    const nodeIds = ['start', 'select-source', 'decision', 'validate', 'end'];
    const bounds = nodeIds.map((id) => ({
      id,
      left: Number(elementAttribute(markup, 'data-node-id', id, 'data-node-left')),
      right: Number(elementAttribute(markup, 'data-node-id', id, 'data-node-right')),
    }));

    expect(bounds[0].left).toBeGreaterThanOrEqual(140 + leftPadding);
    expect(Math.max(...bounds.map((bound) => bound.right))).toBeLessThanOrEqual(canvasWidth - rightPadding);
    expect(bounds.every((bound) => bound.left >= 0 && bound.right <= canvasWidth)).toBe(true);

    const eventAnchorWidth = Number(elementAttribute(markup, 'data-node-id', 'start', 'data-anchor-right'))
      - Number(elementAttribute(markup, 'data-node-id', 'start', 'data-anchor-left'));
    const taskAnchorWidth = Number(elementAttribute(markup, 'data-node-id', 'select-source', 'data-anchor-right'))
      - Number(elementAttribute(markup, 'data-node-id', 'select-source', 'data-anchor-left'));
    const gatewayAnchorWidth = Number(elementAttribute(markup, 'data-node-id', 'decision', 'data-anchor-right'))
      - Number(elementAttribute(markup, 'data-node-id', 'decision', 'data-anchor-left'));
    expect(eventAnchorWidth).toBe(48);
    expect(taskAnchorWidth).toBe(200);
    expect(gatewayAnchorWidth).toBe(80);

    const sameLanePath = elementAttribute(markup, 'data-edge-id', 'edge-1', 'd');
    const crossLanePath = elementAttribute(markup, 'data-edge-id', 'edge-3', 'd');
    expect(sameLanePath).toMatch(/^M[\d.]+,[\d.]+ H[\d.]+$/);
    expect(sameLanePath).not.toContain(' V');
    expect(crossLanePath).toMatch(/^M[\d.]+,[\d.]+ H[\d.]+ V[\d.]+ H[\d.]+$/);
    expect(Number(elementAttribute(markup, 'data-edge-id', 'edge-3', 'data-edge-target-x')))
      .toBeGreaterThan(Number(elementAttribute(markup, 'data-edge-id', 'edge-3', 'data-edge-source-x')));
    expect(elementAttribute(markup, 'data-edge-id', 'edge-3', 'data-edge-gateway-outgoing')).toBe('true');
    const variantLabel = elementBounds(markup, 'data-edge-label', 'edge-3', 'data-label');
    const validLabel = elementBounds(markup, 'data-edge-label', 'edge-4', 'data-label');
    const decisionBounds = elementBounds(markup, 'data-node-id', 'decision', 'data-node');
    const validateBounds = elementBounds(markup, 'data-node-id', 'validate', 'data-node');
    const endBounds = elementBounds(markup, 'data-node-id', 'end', 'data-node');
    expect(intersects(variantLabel, decisionBounds)).toBe(false);
    expect(intersects(variantLabel, validateBounds)).toBe(false);
    expect(intersects(validLabel, validateBounds)).toBe(false);
    expect(intersects(validLabel, endBounds)).toBe(false);
    expect(variantLabel.left).toBeGreaterThanOrEqual(Number(elementAttribute(markup, 'data-node-id', 'decision', 'data-anchor-right')) + 12);
    expect(validLabel.right - validLabel.left).toBe(48);
    expect(variantLabel.right).toBeLessThanOrEqual(canvasWidth - rightPadding);
    expect((markup.match(/data-edge-label=/g) ?? [])).toHaveLength(2);
    expect((markup.match(/data-edge-id=/g) ?? [])).toHaveLength(4);

    expect(bounds.map(({ id, left, right }) => ({ id, left, right }))).toEqual([
      { id: 'start', left: 272, right: 320 },
      { id: 'select-source', left: 416, right: 616 },
      { id: 'decision', left: 696, right: 776 },
      { id: 'validate', left: 856, right: 1056 },
      { id: 'end', left: 1152, right: 1200 },
    ]);
  });

  it('keeps Journey stage grids and state articles shrinkable', () => {
    const source = readFileSync(new URL('../JourneyPortal.tsx', import.meta.url), 'utf8');

    expect(source).toContain('className="min-w-0 max-w-full scroll-mt-24 rounded-2xl');
    expect(source).toContain('className="mt-5 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-5"');
    expect(source).toContain('className="min-w-0 max-w-full overflow-hidden border-t border-slate-200 pt-4"');
    expect(source).toContain('className="mt-3 min-w-0 max-w-full space-y-3"');
  });

  it('preserves fallback rendering for simple text-only diagrams', () => {
    const block = {
      id: 'diagram-2',
      blockType: 'DIAGRAM',
      payload: {
        title: 'Simple Diagram',
        steps: ['Capture intent', 'Validate and control'],
      },
    };

    const markup = renderToStaticMarkup(<JourneyBlockRenderer block={block} />);
    expect(markup).toContain('Capture intent');
    expect(markup).toContain('Validate and control');
    expect(markup).toContain('min-w-0 max-w-full overflow-hidden rounded-xl');
  });

  it('does not activate BPMN rendering without the explicit diagramType discriminator', () => {
    const block = {
      id: 'legacy-structured-diagram',
      blockType: 'DIAGRAM',
      payload: {
        title: 'Existing structured diagram',
        nodes: [{ id: 'legacy-node', label: 'Existing node payload' }],
        edges: [{ id: 'legacy-edge', source: 'legacy-node', target: 'legacy-node' }],
      },
    };

    const markup = renderToStaticMarkup(<JourneyBlockRenderer block={block} />);
    expect(markup).toContain('Existing node payload');
    expect(markup).not.toContain('data-diagram-canvas');
  });

  it('preserves existing non-diagram block rendering', () => {
    const blocks = [
      { id: 'text', blockType: 'RICH_TEXT', payload: { text: 'Existing rich text' } },
      { id: 'table', blockType: 'TABLE', payload: { headers: ['Rule'], rows: [['Existing table row']] } },
      { id: 'checklist', blockType: 'CHECKLIST', payload: { items: ['Existing checklist item'] } },
      { id: 'callout', blockType: 'CALLOUT', payload: { title: 'Existing callout', content: 'Callout body' } },
      { id: 'code', blockType: 'CODE', payload: { text: 'Existing code content' } },
    ];

    const markup = blocks.map((block) => renderToStaticMarkup(<JourneyBlockRenderer block={block} />)).join('');
    expect(markup).toContain('Existing rich text');
    expect(markup).toContain('Existing table row');
    expect(markup).toContain('Existing checklist item');
    expect(markup).toContain('Existing callout');
    expect(markup).toContain('Existing code content');
  });
});
