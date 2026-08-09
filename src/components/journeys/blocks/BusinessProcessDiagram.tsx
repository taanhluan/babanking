type DiagramLane = {
  id: string;
  name: string;
  order?: number;
};

type DiagramNode = {
  id: string;
  type?: string;
  label?: string;
  laneId: string;
  lane?: string;
  owner?: string;
  semanticType?: string;
  description?: string;
  condition?: string;
  exception?: boolean;
  returnPath?: boolean;
};

type DiagramEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  condition?: string;
};

type PositionedNode = {
  node: DiagramNode;
  lane: DiagramLane;
  rank: number;
  rowIndex: number;
  columnX: number;
  centerY: number;
  x: number;
  y: number;
  visualWidth: number;
  visualHeight: number;
  anchorLeft: number;
  anchorRight: number;
};

type NodeLayout = {
  lane: DiagramLane;
  height: number;
  top: number;
};

const MIN_LANE_HEIGHT = 140;
const LANE_LABEL_WIDTH = 140;
const LANE_INNER_PADDING = 18;
const NODE_WIDTH = 200;
const NODE_HEIGHT = 76;
const NODE_SPACING_Y = 14;
const EVENT_DIAMETER = 48;
const GATEWAY_SIZE = 56;
const GATEWAY_EXTENT = 80;
const COLUMN_GAP = 220;
const LEFT_PROCESS_PADDING = 56;
const RIGHT_PROCESS_PADDING = 64;
const TOP_MARGIN = 20;
const BOTTOM_MARGIN = 40;
const EDGE_LABEL_MIN_WIDTH = 48;
const EDGE_LABEL_MAX_WIDTH = 168;
const EDGE_LABEL_LINE_HEIGHT = 16;
const EDGE_LABEL_HORIZONTAL_PADDING = 16;
const EDGE_LABEL_VERTICAL_PADDING = 8;
const EDGE_LABEL_NODE_CLEARANCE = 12;
const EDGE_LABEL_LINE_CLEARANCE = 10;

type Bounds = { left: number; right: number; top: number; bottom: number };

function boundsIntersect(left: Bounds, right: Bounds) {
  return left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top;
}

function edgeLabelSize(text: string, maximumWidth = EDGE_LABEL_MAX_WIDTH) {
  const naturalWidth = Math.max(
    EDGE_LABEL_MIN_WIDTH,
    Math.ceil(text.length * 6.4 + EDGE_LABEL_HORIZONTAL_PADDING),
  );
  const width = Math.min(EDGE_LABEL_MAX_WIDTH, Math.max(EDGE_LABEL_MIN_WIDTH, maximumWidth, 0), naturalWidth);
  const lineCount = Math.max(1, Math.ceil(naturalWidth / width));
  const height = lineCount * EDGE_LABEL_LINE_HEIGHT + EDGE_LABEL_VERTICAL_PADDING;
  return { width, height };
}

function clampLabelBounds(bounds: Bounds, canvasWidth: number, canvasHeight: number) {
  const processLeft = LANE_LABEL_WIDTH + 4;
  const processRight = canvasWidth - RIGHT_PROCESS_PADDING;
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const left = Math.max(processLeft, Math.min(processRight - width, bounds.left));
  const top = Math.max(4, Math.min(canvasHeight - height - 4, bounds.top));
  return { left, right: left + width, top, bottom: top + height };
}

function visualDimensions(type?: string) {
  if (type === 'start-event' || type === 'end-event') {
    return { width: EVENT_DIAMETER, height: EVENT_DIAMETER };
  }
  if (type === 'decision-gateway' || type === 'gateway' || type === 'merge-gateway') {
    return { width: GATEWAY_EXTENT, height: GATEWAY_EXTENT };
  }
  return { width: NODE_WIDTH, height: NODE_HEIGHT };
}

const toRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const toArray = (value: unknown) => Array.isArray(value) ? value : [];
const toString = (value: unknown) => typeof value === 'string' ? value : undefined;
const normalizeId = (value: unknown, fallback: string) => {
  const raw = toString(value);
  return raw ? raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || fallback : fallback;
};

function nodeShape(type?: string) {
  switch (type) {
    case 'start-event':
      return { icon: '●', label: 'Start' };
    case 'end-event':
      return { icon: '●', label: 'End' };
    case 'decision-gateway':
    case 'gateway':
      return { icon: '◆', label: 'Gateway' };
    case 'merge-gateway':
      return { icon: '◇', label: 'Merge' };
    case 'subprocess':
      return { icon: '⬢', label: 'Subprocess' };
    case 'user-task':
    case 'user':
      return { icon: '◧', label: 'User' };
    case 'service-task':
    case 'service':
      return { icon: '▭', label: 'Service' };
    case 'exception':
    case 'error':
      return { icon: '⚠', label: 'Exception' };
    default:
      return { icon: '▭', label: 'Task' };
  }
}

function nodeTone(type?: string) {
  switch (type) {
    case 'start-event':
    case 'end-event':
      return 'border-emerald-300 bg-emerald-50 text-emerald-700';
    case 'decision-gateway':
    case 'gateway':
    case 'merge-gateway':
      return 'border-amber-300 bg-amber-50 text-amber-700';
    case 'subprocess':
      return 'border-violet-300 bg-violet-50 text-violet-700';
    case 'exception':
    case 'error':
      return 'border-rose-300 bg-rose-50 text-rose-700';
    case 'user-task':
    case 'user':
      return 'border-sky-300 bg-sky-50 text-sky-700';
    case 'service-task':
    case 'service':
      return 'border-royalBlue/30 bg-blue-50 text-royalBlue';
    default:
      return 'border-slate-300 bg-white text-navy';
  }
}

export function isBusinessProcessDiagram(payload: Record<string, unknown>) {
  return toString(payload.diagramType) === 'business-process';
}

export function BusinessProcessDiagram({ payload }: { payload: Record<string, unknown> }) {
  const title = toString(payload.title) ?? 'Business workflow visualization';
  const lanes = toArray(payload.lanes)
    .map((lane) => toRecord(lane))
    .filter((lane) => typeof lane.name === 'string' || typeof lane.id === 'string')
    .map((lane, index) => ({
      id: normalizeId(lane.id ?? lane.name ?? `lane-${index + 1}`, `lane-${index + 1}`),
      name: toString(lane.name) ?? `Lane ${index + 1}`,
      order: typeof lane.order === 'number' ? lane.order : index,
    })) as DiagramLane[];
  const nodes = toArray(payload.nodes)
    .map((node) => toRecord(node))
    .filter((node) => typeof node.id === 'string' || typeof node.label === 'string')
    .map((node, index) => ({
      id: normalizeId(node.id ?? node.label ?? `node-${index + 1}`, `node-${index + 1}`),
      type: toString(node.type ?? node.semanticType),
      label: toString(node.label) ?? 'Untitled step',
      laneId: normalizeId(node.laneId ?? node.lane ?? 'default', 'default'),
      owner: toString(node.owner ?? node.actor ?? node.systemOwner),
      semanticType: toString(node.semanticType ?? node.type),
      description: toString(node.description),
      condition: toString(node.condition),
      exception: Boolean(node.exception),
      returnPath: Boolean(node.returnPath),
    })) as DiagramNode[];
  const edges = toArray(payload.edges)
    .map((edge) => toRecord(edge))
    .filter((edge) => typeof edge.source === 'string' || typeof edge.target === 'string')
    .map((edge, index) => ({
      id: normalizeId(edge.id ?? `edge-${index + 1}`, `edge-${index + 1}`),
      source: normalizeId(edge.source, `source-${index + 1}`),
      target: normalizeId(edge.target, `target-${index + 1}`),
      label: toString(edge.label),
      type: toString(edge.type),
      condition: toString(edge.condition),
    })) as DiagramEdge[];

  const laneDefinitions = [...(lanes.length ? lanes : [{ id: 'default', name: 'Flow', order: 0 }])].sort(
    (left, right) => (left.order ?? 0) - (right.order ?? 0),
  );
  const laneLookup = new Map(laneDefinitions.map((lane) => [lane.id, lane]));
  const nodeLookup = new Map(nodes.map((node) => [node.id, node]));
  const validEdges = edges.filter((edge) => nodeLookup.has(edge.source) && nodeLookup.has(edge.target));
  const nodeOrder = new Map(nodes.map((node, index) => [node.id, index]));

  const incomingEdges = new Map<string, DiagramEdge[]>();
  const outgoingEdges = new Map<string, DiagramEdge[]>();
  nodes.forEach((node) => {
    incomingEdges.set(node.id, []);
    outgoingEdges.set(node.id, []);
  });
  validEdges.forEach((edge) => {
    outgoingEdges.get(edge.source)?.push(edge);
    incomingEdges.get(edge.target)?.push(edge);
  });

  const topologicalOrder = (() => {
    const indegree = new Map(nodes.map((node) => [node.id, 0]));
    const outgoing = new Map<string, DiagramEdge[]>();
    nodes.forEach((node) => outgoing.set(node.id, []));
    validEdges.forEach((edge) => {
      indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
      outgoing.get(edge.source)?.push(edge);
    });

    const ready = nodes.filter((node) => indegree.get(node.id) === 0).sort((left, right) => (nodeOrder.get(left.id) ?? 0) - (nodeOrder.get(right.id) ?? 0));
    const ordered: DiagramNode[] = [];
    const remaining = new Set(nodes.map((node) => node.id));
    const indegreeCopy = new Map(indegree);

    while (ready.length) {
      const current = ready.shift()!;
      ordered.push(current);
      remaining.delete(current.id);
      outgoing.get(current.id)?.forEach((edge) => {
        indegreeCopy.set(edge.target, (indegreeCopy.get(edge.target) ?? 0) - 1);
        if (indegreeCopy.get(edge.target) === 0) {
          const candidate = nodeLookup.get(edge.target);
          if (candidate) ready.push(candidate);
          ready.sort((left, right) => (nodeOrder.get(left.id) ?? 0) - (nodeOrder.get(right.id) ?? 0));
        }
      });
    }

    if (remaining.size) {
      const rest = nodes.filter((node) => remaining.has(node.id)).sort((left, right) => (nodeOrder.get(left.id) ?? 0) - (nodeOrder.get(right.id) ?? 0));
      ordered.push(...rest);
    }

    return ordered;
  })();

  const nodeRankOrder = new Map(topologicalOrder.map((node, index) => [node.id, index]));
  const forwardEdgeIds = new Set(
    validEdges.filter((edge) => (nodeRankOrder.get(edge.target) ?? 0) > (nodeRankOrder.get(edge.source) ?? 0)).map((edge) => edge.id),
  );
  const backwardEdgeIds = new Set(
    validEdges.filter((edge) => (nodeRankOrder.get(edge.target) ?? 0) <= (nodeRankOrder.get(edge.source) ?? 0)).map((edge) => edge.id),
  );

  const nodeRanks = new Map(nodes.map((node) => [node.id, Number.NEGATIVE_INFINITY]));
  nodes.forEach((node) => {
    if (node.type === 'start-event' || (incomingEdges.get(node.id)?.length ?? 0) === 0) {
      nodeRanks.set(node.id, 0);
    }
  });
  topologicalOrder.forEach((node) => {
    const currentRank = Math.max(0, nodeRanks.get(node.id) ?? 0);
    outgoingEdges.get(node.id)?.forEach((edge) => {
      if (!forwardEdgeIds.has(edge.id)) return;
      const targetRank = Math.max(nodeRanks.get(edge.target) ?? 0, currentRank + 1);
      nodeRanks.set(edge.target, targetRank);
    });
  });

  const nodesByLaneAndRank = laneDefinitions.reduce<Record<string, Record<number, DiagramNode[]>>>((grouped, lane) => {
    grouped[lane.id] = {};
    return grouped;
  }, {} as Record<string, Record<number, DiagramNode[]>>);
  const laneRankCounts = laneDefinitions.reduce<Record<string, Record<number, number>>>((grouped, lane) => {
    grouped[lane.id] = {};
    return grouped;
  }, {} as Record<string, Record<number, number>>);

  const positionedNodes: PositionedNode[] = nodes.map((node) => {
    const lane = laneLookup.get(node.laneId as string) ?? laneDefinitions[0];
    const rank = Math.max(0, nodeRanks.get(node.id) ?? 0);
    const rankGroup = nodesByLaneAndRank[lane.id];
    rankGroup[rank] = rankGroup[rank] ?? [];
    const rowIndex = rankGroup[rank].length;
    rankGroup[rank].push(node);
    laneRankCounts[lane.id][rank] = (laneRankCounts[lane.id][rank] ?? 0) + 1;
    return {
      node,
      lane,
      rank,
      rowIndex,
      columnX: 0,
      centerY: 0,
      x: 0,
      y: 0,
      visualWidth: 0,
      visualHeight: 0,
      anchorLeft: 0,
      anchorRight: 0,
    };
  });

  const laneLayouts: NodeLayout[] = laneDefinitions.map((lane) => {
    const rankValues = Object.values(laneRankCounts[lane.id] ?? {});
    const maxRows = Math.max(1, ...rankValues);
    const height = Math.max(MIN_LANE_HEIGHT, maxRows * (NODE_HEIGHT + NODE_SPACING_Y) + LANE_INNER_PADDING * 2);
    return { lane, height, top: 0 };
  });

  let currentTop = TOP_MARGIN;
  laneLayouts.forEach((layout) => {
    layout.top = currentTop;
    currentTop += layout.height;
  });

  const positionedNodesFinal = positionedNodes.map((entry) => {
    const laneLayout = laneLayouts.find((layout) => layout.lane.id === entry.lane.id)!;
    const dimensions = visualDimensions(entry.node.type);
    const columnX = LANE_LABEL_WIDTH + LEFT_PROCESS_PADDING + entry.rank * COLUMN_GAP;
    const rankCount = laneRankCounts[entry.lane.id]?.[entry.rank] ?? 1;
    const rankGroupHeight = rankCount * NODE_HEIGHT + Math.max(0, rankCount - 1) * NODE_SPACING_Y;
    const centerY = laneLayout.top
      + (laneLayout.height - rankGroupHeight) / 2
      + NODE_HEIGHT / 2
      + entry.rowIndex * (NODE_HEIGHT + NODE_SPACING_Y);
    const x = columnX + (NODE_WIDTH - dimensions.width) / 2;
    const y = centerY - dimensions.height / 2;
    return {
      ...entry,
      columnX,
      centerY,
      x,
      y,
      visualWidth: dimensions.width,
      visualHeight: dimensions.height,
      anchorLeft: x,
      anchorRight: x + dimensions.width,
    };
  });

  const maxNodeRight = Math.max(
    LANE_LABEL_WIDTH + LEFT_PROCESS_PADDING,
    ...positionedNodesFinal.map((entry) => Math.max(entry.x + entry.visualWidth, entry.columnX + NODE_WIDTH)),
  );
  const canvasWidth = Math.max(760, maxNodeRight + RIGHT_PROCESS_PADDING);
  const canvasHeight = currentTop + BOTTOM_MARGIN;

  const placedLabelBounds: Bounds[] = [];
  const nodeBounds = positionedNodesFinal.map((position) => ({
    left: position.x,
    right: position.x + position.visualWidth,
    top: position.y,
    bottom: position.y + position.visualHeight,
  }));
  const gatewayCaptionBounds = positionedNodesFinal
    .filter((position) => ['decision-gateway', 'gateway', 'merge-gateway'].includes(position.node.type ?? ''))
    .map((position) => ({
      left: position.columnX,
      right: position.columnX + NODE_WIDTH,
      top: position.centerY + GATEWAY_EXTENT / 2 + 8,
      bottom: position.centerY + GATEWAY_EXTENT / 2 + 48,
    }));

  const edgeLayouts = validEdges.map((edge, edgeIndex) => {
    const sourceNode = nodeLookup.get(edge.source)!;
    const targetNode = nodeLookup.get(edge.target)!;
    const sourcePosition = positionedNodesFinal.find((entry) => entry.node.id === sourceNode.id)!;
    const targetPosition = positionedNodesFinal.find((entry) => entry.node.id === targetNode.id)!;
    const sourcePoint = { x: sourcePosition.anchorRight, y: sourcePosition.centerY };
    const targetPoint = { x: targetPosition.anchorLeft, y: targetPosition.centerY };
    const isReturn = backwardEdgeIds.has(edge.id);
    const isCrossLane = sourcePosition.lane.id !== targetPosition.lane.id;
    const isGatewayOutgoing = ['decision-gateway', 'gateway', 'merge-gateway'].includes(sourcePosition.node.type ?? '');
    const labelText = edge.condition ?? edge.label;

    let path = '';
    let midX = (sourcePoint.x + targetPoint.x) / 2;
    let returnY: number | undefined;

    if (!isReturn) {
      if (!isCrossLane) {
        path = `M${sourcePoint.x},${sourcePoint.y} H${targetPoint.x}`;
      } else {
        const availableGap = Math.max(0, targetPoint.x - sourcePoint.x);
        midX = sourcePoint.x + availableGap / 2;
        path = `M${sourcePoint.x},${sourcePoint.y} H${midX} V${targetPoint.y} H${targetPoint.x}`;
      }
    } else {
      returnY = canvasHeight - BOTTOM_MARGIN / 2 - edgeIndex * 12;
      const horizontalOffset = 24;
      path = `M${sourcePoint.x},${sourcePoint.y} H${sourcePoint.x + horizontalOffset} V${returnY} H${targetPoint.x - horizontalOffset} V${targetPoint.y} H${targetPoint.x}`;
    }

    let labelBounds: Bounds | undefined;
    if (labelText) {
      const sameLaneAvailableWidth = Math.max(
        EDGE_LABEL_MIN_WIDTH,
        targetPoint.x - sourcePoint.x - EDGE_LABEL_NODE_CLEARANCE * 2,
      );
      const size = edgeLabelSize(
        labelText,
        !isCrossLane && !isReturn ? sameLaneAvailableWidth : EDGE_LABEL_MAX_WIDTH,
      );
      const aboveSource = {
        left: sourcePoint.x + EDGE_LABEL_NODE_CLEARANCE,
        right: sourcePoint.x + EDGE_LABEL_NODE_CLEARANCE + size.width,
        top: sourcePoint.y - size.height - EDGE_LABEL_LINE_CLEARANCE,
        bottom: sourcePoint.y - EDGE_LABEL_LINE_CLEARANCE,
      };
      const aboveTarget = {
        left: targetPoint.x - EDGE_LABEL_NODE_CLEARANCE - size.width,
        right: targetPoint.x - EDGE_LABEL_NODE_CLEARANCE,
        top: targetPoint.y - size.height - EDGE_LABEL_LINE_CLEARANCE,
        bottom: targetPoint.y - EDGE_LABEL_LINE_CLEARANCE,
      };
      const centeredAbove = {
        left: (sourcePoint.x + targetPoint.x - size.width) / 2,
        right: (sourcePoint.x + targetPoint.x + size.width) / 2,
        top: sourcePoint.y - size.height - EDGE_LABEL_LINE_CLEARANCE,
        bottom: sourcePoint.y - EDGE_LABEL_LINE_CLEARANCE,
      };
      const belowSource = {
        left: sourcePoint.x + EDGE_LABEL_NODE_CLEARANCE,
        right: sourcePoint.x + EDGE_LABEL_NODE_CLEARANCE + size.width,
        top: sourcePoint.y + EDGE_LABEL_LINE_CLEARANCE,
        bottom: sourcePoint.y + EDGE_LABEL_LINE_CLEARANCE + size.height,
      };
      const besideVertical = {
        left: midX - size.width / 2,
        right: midX + size.width / 2,
        top: (sourcePoint.y + targetPoint.y - size.height) / 2,
        bottom: (sourcePoint.y + targetPoint.y + size.height) / 2,
      };
      const aboveReturn = {
        left: (sourcePoint.x + targetPoint.x - size.width) / 2,
        right: (sourcePoint.x + targetPoint.x + size.width) / 2,
        top: (returnY ?? sourcePoint.y) - size.height - EDGE_LABEL_LINE_CLEARANCE,
        bottom: (returnY ?? sourcePoint.y) - EDGE_LABEL_LINE_CLEARANCE,
      };
      const candidates = isReturn
        ? [aboveReturn, aboveSource, aboveTarget, belowSource]
        : isGatewayOutgoing
          ? [aboveSource, aboveTarget, besideVertical, belowSource]
          : isCrossLane
            ? [aboveSource, aboveTarget, besideVertical, belowSource]
            : [centeredAbove, aboveSource, aboveTarget, belowSource];
      const normalizedCandidates = candidates.map((candidate) =>
        clampLabelBounds(candidate, canvasWidth, canvasHeight));
      const obstacles = [...nodeBounds, ...gatewayCaptionBounds, ...placedLabelBounds];
      labelBounds = normalizedCandidates.find((candidate) =>
        obstacles.every((obstacle) => !boundsIntersect(candidate, obstacle)));
      if (!labelBounds) {
        labelBounds = normalizedCandidates
          .map((candidate) => ({
            candidate,
            collisions: obstacles.filter((obstacle) => boundsIntersect(candidate, obstacle)).length,
          }))
          .sort((left, right) => left.collisions - right.collisions)[0].candidate;
      }
      placedLabelBounds.push(labelBounds);
    }

    return {
      edge,
      path,
      isReturn,
      isCrossLane,
      isGatewayOutgoing,
      labelText,
      labelBounds,
      sourcePoint,
      targetPoint,
      sourceLane: sourcePosition.lane,
      targetLane: targetPosition.lane,
    };
  });

  const summaryItems = topologicalOrder.map((node) => {
    const laneName = laneLookup.get(node.laneId as string)?.name ?? 'Unknown lane';
    return `${node.label} (${laneName})`;
  });

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-5" aria-labelledby="business-process-diagram-title" aria-label={title}>
      <h4 id="business-process-diagram-title" className="sr-only">
        {title}
      </h4>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          BPMN-aligned business workflow visualization
        </span>
      </div>

      <div data-diagram-scroll className="mt-4 w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-2xl border border-slate-200 bg-white p-3">
        <div
          data-diagram-canvas
          data-canvas-width={canvasWidth}
          data-canvas-height={canvasHeight}
          data-left-process-padding={LEFT_PROCESS_PADDING}
          data-right-process-padding={RIGHT_PROCESS_PADDING}
          className="relative"
          style={{ width: `${canvasWidth}px`, minWidth: `${canvasWidth}px`, minHeight: `${canvasHeight}px` }}
        >
          {laneLayouts.map((layout) => (
            <div key={layout.lane.id} className="absolute left-0 right-0 rounded-3xl bg-slate-50/80 shadow-sm" style={{ top: layout.top, height: layout.height }}>
              <div
                data-lane-label={layout.lane.id}
                className="sticky left-0 z-30 flex h-full items-start rounded-l-3xl border-r border-slate-200 bg-slate-100 px-4 py-4 text-xs font-semibold uppercase tracking-wide text-slate-700 shadow-[4px_0_8px_rgba(15,23,42,0.06)]"
                style={{ width: `${LANE_LABEL_WIDTH}px` }}
              >
                {layout.lane.name}
              </div>
              <div className="absolute right-0 top-1/2 h-[1px] bg-slate-300 opacity-80" style={{ left: `${LANE_LABEL_WIDTH}px` }} />
            </div>
          ))}

          <svg className="absolute inset-0 z-10" width={canvasWidth} height={canvasHeight} aria-hidden="true">
            <defs>
              <marker id="bpmn-arrowhead" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
              </marker>
            </defs>
            {edgeLayouts.map((layout) => (
              <g key={layout.edge.id}>
                <path
                  data-edge-id={layout.edge.id}
                  data-edge-return={String(layout.isReturn)}
                  data-edge-cross-lane={String(layout.isCrossLane)}
                  data-edge-gateway-outgoing={String(layout.isGatewayOutgoing)}
                  data-edge-source-x={layout.sourcePoint.x}
                  data-edge-source-y={layout.sourcePoint.y}
                  data-edge-target-x={layout.targetPoint.x}
                  data-edge-target-y={layout.targetPoint.y}
                  d={layout.path}
                  fill="none"
                  stroke={layout.isReturn ? '#be123c' : '#0f172a'}
                  strokeWidth="2"
                  markerEnd="url(#bpmn-arrowhead)"
                />
                {layout.labelText && layout.labelBounds ? (
                  <foreignObject
                    data-edge-label={layout.edge.id}
                    data-label-left={layout.labelBounds.left}
                    data-label-right={layout.labelBounds.right}
                    data-label-top={layout.labelBounds.top}
                    data-label-bottom={layout.labelBounds.bottom}
                    x={layout.labelBounds.left}
                    y={layout.labelBounds.top}
                    width={layout.labelBounds.right - layout.labelBounds.left}
                    height={layout.labelBounds.bottom - layout.labelBounds.top}
                  >
                    <div className="flex h-full w-full items-center justify-center rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-center text-[11px] font-semibold leading-4 text-slate-700 shadow-sm whitespace-normal break-words">
                      {layout.labelText}
                    </div>
                  </foreignObject>
                ) : null}
              </g>
            ))}
          </svg>

          <div className="absolute inset-0 z-20">
            {positionedNodesFinal.map((positioned) => {
              const node = positioned.node;
              const shape = nodeShape(node.type);
              const tone = nodeTone(node.type);
              const laneName = laneLookup.get(node.laneId as string)?.name ?? 'Unknown lane';
              const isEvent = node.type === 'start-event' || node.type === 'end-event';
              const isGateway = node.type === 'decision-gateway' || node.type === 'gateway' || node.type === 'merge-gateway';
              return (
                <div
                  key={node.id}
                  data-node-id={node.id}
                  data-node-type={node.type ?? 'task'}
                  data-node-shape={isEvent ? 'event' : isGateway ? 'gateway' : 'task'}
                  data-node-rank={positioned.rank}
                  data-node-left={positioned.x}
                  data-node-right={positioned.x + positioned.visualWidth}
                  data-node-top={positioned.y}
                  data-node-bottom={positioned.y + positioned.visualHeight}
                  data-anchor-left={positioned.anchorLeft}
                  data-anchor-right={positioned.anchorRight}
                  role="group"
                  aria-label={`${node.label}, ${shape.label}, ${laneName}`}
                  className="absolute"
                  style={{
                    left: `${positioned.columnX}px`,
                    top: `${positioned.centerY - (isEvent ? EVENT_DIAMETER : isGateway ? GATEWAY_SIZE : NODE_HEIGHT) / 2}px`,
                    width: `${NODE_WIDTH}px`,
                    minHeight: `${isEvent ? EVENT_DIAMETER : isGateway ? GATEWAY_SIZE : NODE_HEIGHT}px`,
                  }}
                >
                  {isEvent ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-current bg-white text-base font-semibold text-current ${tone}`}>
                        {shape.icon}
                      </div>
                      <p className="text-center text-sm font-semibold leading-5 text-navy whitespace-normal break-words">{node.label}</p>
                    </div>
                  ) : isGateway ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-sm border-2 border-current bg-white text-lg font-semibold text-current" style={{ transform: 'rotate(45deg)' }}>
                        <span className="block transform -rotate-45">{shape.icon}</span>
                      </div>
                      <p className="mt-2 text-center text-sm font-semibold leading-5 text-navy whitespace-normal break-words">{node.label}</p>
                    </div>
                  ) : (
                    <div className={`flex min-h-[76px] w-full flex-col justify-center gap-3 rounded-3xl border-2 px-4 py-4 text-sm font-semibold text-navy ${tone}`}>
                      <div className="flex items-start gap-3">
                        <span aria-hidden="true" className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-base">
                          {shape.icon}
                        </span>
                        <span className="whitespace-normal break-words leading-5 text-left">{node.label}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="sr-only">
        <p className="font-semibold text-navy">Accessible summary</p>
        <p>This workflow is rendered as a BPMN-style swimlane diagram with chronological flow across lanes and labeled sequence connectors.</p>
        {summaryItems.map((item, index) => (
          <p key={index}>{`${index + 1}. ${item}`}</p>
        ))}
      </div>
    </section>
  );
}
