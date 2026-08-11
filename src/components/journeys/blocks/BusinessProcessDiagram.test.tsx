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

function largeGraphBlock() {
  const lanes = Array.from({ length: 5 }, (_, index) => ({ id: `lane-${index}`, name: `Lane ${index}`, order: index }));
  const nodes = Array.from({ length: 80 }, (_, index) => ({
    id: `node-${index}`,
    type: index === 0 ? 'start-event' : index === 79 ? 'end-event' : index % 7 === 0 ? 'decision-gateway' : index % 2 ? 'user-task' : 'service-task',
    label: `Detailed business process node ${index}`,
    laneId: `lane-${index % 5}`,
  }));
  const edges = Array.from({ length: 79 }, (_, index) => ({ id: `forward-${index}`, source: `node-${index}`, target: `node-${index + 1}`, condition: index % 7 === 0 ? `Branch ${index}` : undefined }));
  for (let index = 0; index < 19; index += 1) {
    const source = 10 + index * 3;
    edges.push({ id: `return-${index}`, source: `node-${source}`, target: `node-${Math.max(1, source - 5)}`, condition: `Retry ${index}` });
  }
  return { id: 'large-diagram', blockType: 'DIAGRAM', payload: { title: 'Large deterministic flow', diagramType: 'business-process', lanes, nodes, edges } };
}

function allElementValues(markup: string, attribute: string) {
  return [...markup.matchAll(new RegExp(`${attribute}="([^"]+)"`, 'g'))].map((match) => match[1]);
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
    for (const port of ['left', 'right', 'top', 'bottom']) {
      expect(Number(elementAttribute(markup, 'data-node-id', 'decision', `data-port-${port}-x`))).toBeGreaterThan(0);
      expect(Number(elementAttribute(markup, 'data-node-id', 'decision', `data-port-${port}-y`))).toBeGreaterThan(0);
    }

    const sameLanePath = elementAttribute(markup, 'data-edge-id', 'edge-1', 'd');
    const crossLanePath = elementAttribute(markup, 'data-edge-id', 'edge-3', 'd');
    expect(sameLanePath).toMatch(/^M[\d.]+,[\d.]+ (?:H|V)[\d.]+/);
    expect(crossLanePath).toMatch(/^M[\d.]+,[\d.]+ (?:H|V)[\d.]+/);
    expect(Number(elementAttribute(markup, 'data-edge-id', 'edge-3', 'data-edge-target-x')))
      .toBeGreaterThan(Number(elementAttribute(markup, 'data-edge-id', 'edge-3', 'data-edge-source-x')));
    expect(elementAttribute(markup, 'data-edge-id', 'edge-3', 'data-edge-gateway-outgoing')).toBe('true');
    expect(elementAttribute(markup, 'data-edge-id', 'edge-2', 'data-edge-target-port')).toBe('left');
    expect(elementAttribute(markup, 'data-edge-id', 'edge-2', 'data-edge-target-x'))
      .toBe(elementAttribute(markup, 'data-node-id', 'decision', 'data-port-left-x'));
    expect(elementAttribute(markup, 'data-edge-id', 'edge-3', 'data-edge-source-port')).toBe('right');
    expect(elementAttribute(markup, 'data-edge-id', 'edge-3', 'marker-end')).toBe('url(#bpmn-arrowhead)');
    expect(markup.match(/data-edge-id="edge-3"[^>]*marker-start=/)).toBeNull();
    const variantLabel = elementBounds(markup, 'data-edge-label', 'edge-3', 'data-label');
    const validLabel = elementBounds(markup, 'data-edge-label', 'edge-4', 'data-label');
    const decisionBounds = elementBounds(markup, 'data-node-id', 'decision', 'data-node');
    const validateBounds = elementBounds(markup, 'data-node-id', 'validate', 'data-node');
    const endBounds = elementBounds(markup, 'data-node-id', 'end', 'data-node');
    expect(intersects(variantLabel, decisionBounds)).toBe(false);
    expect(intersects(variantLabel, validateBounds)).toBe(false);
    expect(intersects(validLabel, validateBounds)).toBe(false);
    expect(intersects(validLabel, endBounds)).toBe(false);
    expect(validLabel.right - validLabel.left).toBe(48);
    expect(variantLabel.right).toBeLessThanOrEqual(canvasWidth - rightPadding);
    expect((markup.match(/data-edge-label=/g) ?? [])).toHaveLength(2);
    expect((markup.match(/data-edge-id=/g) ?? [])).toHaveLength(4);

    expect(bounds.every((bound, index) => !index || bound.left > bounds[index - 1].left)).toBe(true);
    expect(allElementValues(markup, 'data-edge-route-clear').filter((value) => value !== 'true')).toEqual([]);
  });

  it('renders an 80-node and 98-edge graph without collisions or blocked routes', () => {
    const started = performance.now();
    const markup = renderToStaticMarkup(<JourneyBlockRenderer block={largeGraphBlock()} />);
    const elapsed = performance.now() - started;
    const nodeIds = allElementValues(markup, 'data-node-id');
    const edgeIds = allElementValues(markup, 'data-edge-id');
    expect(nodeIds).toHaveLength(80);
    expect(edgeIds).toHaveLength(98);
    expect(allElementValues(markup, 'data-edge-route-clear').filter((value) => value !== 'true')).toEqual([]);
    const bounds = nodeIds.map((id) => elementBounds(markup, 'data-node-id', id, 'data-node'));
    for (let left = 0; left < bounds.length; left += 1) {
      for (let right = left + 1; right < bounds.length; right += 1) expect(intersects(bounds[left], bounds[right])).toBe(false);
    }
    expect(elapsed).toBeLessThan(2000);
  });

  it('excludes cycles from rank propagation and routes short returns as distinct local loops', () => {
    const markup = renderToStaticMarkup(<JourneyBlockRenderer block={largeGraphBlock()} />);
    const tracks = Array.from({ length: 19 }, (_, index) => elementAttribute(markup, 'data-edge-id', `return-${index}`, 'data-edge-route-track'));
    expect(new Set(tracks).size).toBe(19);
    expect(Array.from({ length: 19 }, (_, index) => elementAttribute(markup, 'data-edge-id', `return-${index}`, 'data-edge-return')).every((value) => value === 'true')).toBe(true);
    expect(Array.from({ length: 19 }, (_, index) => elementAttribute(markup, 'data-edge-id', `return-${index}`, 'data-edge-return-scope')).every((value) => value === 'local')).toBe(true);
    expect(elementAttribute(markup, 'data-edge-id', 'return-0', 'data-edge-priority')).toBe('exception');
    expect(elementAttribute(markup, 'data-edge-id', 'return-0', 'stroke')).toBe('#9f5353');
    expect(elementAttribute(markup, 'data-edge-id', 'return-0', 'stroke-dasharray')).toBe('6 5');
    expect(Number(elementAttribute(markup, 'data-node-id', 'node-79', 'data-node-rank'))).toBe(79);
  });

  it('places parallel branches in the same rank and remains deterministic', () => {
    const block = { id: 'branches', blockType: 'DIAGRAM', payload: { diagramType: 'business-process', lanes: [{ id: 'lane', name: 'Lane' }], nodes: [
      { id: 'start', type: 'start-event', label: 'Start', laneId: 'lane' },
      { id: 'gateway', type: 'decision-gateway', label: 'Choose', laneId: 'lane' },
      { id: 'a', type: 'service-task', label: 'A', laneId: 'lane' }, { id: 'b', type: 'service-task', label: 'B', laneId: 'lane' }, { id: 'c', type: 'service-task', label: 'C', laneId: 'lane' },
      { id: 'end', type: 'end-event', label: 'End', laneId: 'lane' },
    ], edges: [
      { id: 's-g', source: 'start', target: 'gateway' }, { id: 'g-a', source: 'gateway', target: 'a', condition: 'A' }, { id: 'g-b', source: 'gateway', target: 'b', condition: 'B' }, { id: 'g-c', source: 'gateway', target: 'c', condition: 'C' },
      { id: 'a-e', source: 'a', target: 'end' }, { id: 'b-e', source: 'b', target: 'end' }, { id: 'c-e', source: 'c', target: 'end' },
    ] } };
    const first = renderToStaticMarkup(<JourneyBlockRenderer block={block} />);
    const second = renderToStaticMarkup(<JourneyBlockRenderer block={block} />);
    const ranks = ['a', 'b', 'c'].map((id) => elementAttribute(first, 'data-node-id', id, 'data-node-rank'));
    expect(new Set(ranks).size).toBe(1);
    expect(first).toBe(second);
    const shapeBottom = Number(elementAttribute(first, 'data-node-id', 'gateway', 'data-gateway-shape-bottom'));
    const labelTop = Number(elementAttribute(first, 'data-node-id', 'gateway', 'data-gateway-label-top'));
    expect(labelTop).toBeGreaterThan(shapeBottom);
    const gatewayRight = Number(elementAttribute(first, 'data-node-id', 'gateway', 'data-anchor-right'));
    const branchPaths = ['g-a', 'g-b', 'g-c'].map((id) => elementAttribute(first, 'data-edge-id', id, 'd'));
    expect(new Set(branchPaths).size).toBe(3);
    const branchPorts = ['g-a', 'g-b', 'g-c'].map((id) => [
      elementAttribute(first, 'data-edge-id', id, 'data-edge-source-x'),
      elementAttribute(first, 'data-edge-id', id, 'data-edge-source-y'),
    ].join(','));
    expect(new Set(branchPorts).size).toBe(3);
    const canvasWidth = Number(elementAttribute(first, 'data-diagram-canvas', 'true', 'data-canvas-width'));
    const canvasHeight = Number(elementAttribute(first, 'data-diagram-canvas', 'true', 'data-canvas-height'));
    for (const edge of ['g-a', 'g-b', 'g-c']) {
      const label = elementBounds(first, 'data-edge-label', edge, 'data-label');
      expect(label.left).toBeGreaterThanOrEqual(0);
      expect(label.right).toBeLessThanOrEqual(canvasWidth);
      expect(label.top).toBeGreaterThanOrEqual(0);
      expect(label.bottom).toBeLessThanOrEqual(canvasHeight);
      expect(label.left - gatewayRight).toBeLessThan(220);
    }
  });

  it('uses distinct semantic ports for beneficiary binary decisions and keeps branch labels clear', () => {
    const block = { id: 'beneficiary-decisions', blockType: 'DIAGRAM', payload: { diagramType: 'business-process', lanes: [{ id: 'lane', name: 'Payment Service' }], nodes: [
      { id: 'start', type: 'start-event', label: 'Start', laneId: 'lane' },
      { id: 'beneficiary-found', type: 'decision-gateway', label: 'Beneficiary account found?', laneId: 'lane' },
      { id: 'beneficiary-valid', type: 'decision-gateway', label: 'Beneficiary eligible?', laneId: 'lane' },
      { id: 'same-account-check', type: 'decision-gateway', label: 'Source and destination identical?', laneId: 'lane' },
      { id: 'not-found', type: 'exception', label: 'Not found', laneId: 'lane' },
      { id: 'ineligible', type: 'exception', label: 'Ineligible', laneId: 'lane' },
      { id: 'same-account-error', type: 'exception', label: 'Same account error', laneId: 'lane' },
      { id: 'display-name', type: 'service-task', label: 'Display beneficiary name', laneId: 'lane' },
      { id: 'end', type: 'end-event', label: 'End', laneId: 'lane' },
    ], edges: [
      { id: 'to-found', source: 'start', target: 'beneficiary-found' },
      { id: 'found-yes', source: 'beneficiary-found', target: 'beneficiary-valid', condition: 'Yes' },
      { id: 'found-no', source: 'beneficiary-found', target: 'not-found', condition: 'No' },
      { id: 'valid-yes', source: 'beneficiary-valid', target: 'same-account-check', condition: 'Yes' },
      { id: 'valid-no', source: 'beneficiary-valid', target: 'ineligible', condition: 'No' },
      { id: 'same-yes', source: 'same-account-check', target: 'same-account-error', condition: 'Yes' },
      { id: 'same-no', source: 'same-account-check', target: 'display-name', condition: 'No' },
      { id: 'not-found-end', source: 'not-found', target: 'end' },
      { id: 'ineligible-end', source: 'ineligible', target: 'end' },
      { id: 'same-error-end', source: 'same-account-error', target: 'end' },
      { id: 'display-end', source: 'display-name', target: 'end' },
    ] } };
    const markup = renderToStaticMarkup(<JourneyBlockRenderer block={block} />);

    expect(elementAttribute(markup, 'data-edge-id', 'to-found', 'data-edge-target-port')).toBe('left');
    for (const pair of [['found-yes', 'found-no'], ['valid-yes', 'valid-no'], ['same-yes', 'same-no']]) {
      const ports = pair.map((id) => `${elementAttribute(markup, 'data-edge-id', id, 'data-edge-source-x')},${elementAttribute(markup, 'data-edge-id', id, 'data-edge-source-y')}`);
      expect(new Set(ports).size).toBe(2);
    }
    expect(elementAttribute(markup, 'data-edge-id', 'found-yes', 'data-edge-source-port')).toBe('right');
    expect(elementAttribute(markup, 'data-edge-id', 'valid-yes', 'data-edge-source-port')).toBe('right');
    expect(elementAttribute(markup, 'data-edge-id', 'same-no', 'data-edge-source-port')).toBe('right');
    expect(allElementValues(markup, 'data-edge-route-clear').filter((value) => value !== 'true')).toEqual([]);

    const labels = ['found-yes', 'found-no', 'valid-yes', 'valid-no', 'same-yes', 'same-no']
      .map((id) => elementBounds(markup, 'data-edge-label', id, 'data-label'));
    for (let left = 0; left < labels.length; left += 1) {
      for (let right = left + 1; right < labels.length; right += 1) expect(intersects(labels[left], labels[right])).toBe(false);
    }
  });

  it('keeps Journey stage grids and state articles shrinkable', () => {
    const source = readFileSync(new URL('../SharedJourneyReader.tsx', import.meta.url), 'utf8');

    expect(source).toContain('className="min-w-0 max-w-full scroll-mt-24 rounded-2xl');
    expect(source).toContain('className="mt-5 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-5"');
    expect(source).toContain('className="min-w-0 max-w-full overflow-hidden border-t');
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

  it('activates BPMN only through the business-process JSON discriminator', () => {
    const payload = {
      lanes: [{ id: 'lane', name: 'Operations' }],
      nodes: [{ id: 'start', type: 'start-event', label: 'Start', laneId: 'lane' }],
      edges: [],
    };
    const legacy = renderToStaticMarkup(<JourneyBlockRenderer block={{ id: 'toggle', blockType: 'DIAGRAM', payload }} />);
    const bpmn = renderToStaticMarkup(<JourneyBlockRenderer block={{ id: 'toggle', blockType: 'DIAGRAM', payload: { ...payload, diagramType: 'business-process' } }} />);

    expect(legacy).not.toContain('data-diagram-canvas');
    expect(legacy).toContain('<ol');
    expect(legacy).toContain('&quot;id&quot;:&quot;start&quot;');
    expect(bpmn).toContain('data-diagram-canvas');
    expect(bpmn).toContain('data-node-id="start"');
    const nonDiagram = renderToStaticMarkup(<JourneyBlockRenderer block={{ id: 'toggle', blockType: 'FLOW', payload: { ...payload, diagramType: 'business-process' } }} />);
    expect(nonDiagram).not.toContain('data-diagram-canvas');
  });

  it('repairs a legacy text wrapper when valid business-process data is present', () => {
    const description = 'Diagram metadata must not be rendered inside the canvas.';
    const block = {
      id: 'legacy-wrapper', blockType: 'RICH_TEXT', payload: {
        title: 'Internal Transfer – General Business Process Flow', description,
        diagramType: 'business-process', orientation: 'horizontal',
        lanes: [
          { id: 'customer', name: 'Customer / Initiating User' },
          { id: 'channel', name: 'Digital Banking Channel' },
          { id: 'payment', name: 'Payment Service' },
          { id: 'core', name: 'Core Banking / Account Service' },
        ],
        nodes: [
          { id: 'start', type: 'start-event', label: 'Start transfer', laneId: 'customer' },
          { id: 'decision', type: 'decision-gateway', label: 'Valid?', laneId: 'payment' },
          { id: 'end', type: 'end-event', label: 'Ready for review', laneId: 'core' },
        ],
        edges: [
          { id: 'start-decision', source: 'start', target: 'decision' },
          { id: 'decision-end', source: 'decision', target: 'end', condition: 'Yes' },
          { id: 'missing-target', source: 'decision', target: 'unknown', condition: 'No' },
        ],
      },
    };
    const markup = renderToStaticMarkup(<JourneyBlockRenderer block={block} />);

    expect(markup).toContain('data-diagram-canvas');
    expect(allElementValues(markup, 'data-lane-label')).toHaveLength(4);
    expect(allElementValues(markup, 'data-node-id')).toHaveLength(3);
    expect(allElementValues(markup, 'data-edge-id')).toEqual(['start-decision', 'decision-end']);
    expect(markup).toContain('Yes');
    expect(markup).not.toContain(description);
  });
});
