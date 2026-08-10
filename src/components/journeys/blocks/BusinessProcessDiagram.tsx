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
  obstacleLeft: number;
  obstacleRight: number;
  obstacleTop: number;
  obstacleBottom: number;
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
const NODE_SPACING_Y = 28;
const EVENT_DIAMETER = 48;
const GATEWAY_SIZE = 56;
const GATEWAY_EXTENT = 80;
const MIN_HORIZONTAL_NODE_GAP = 48;
const MIN_RANK_STEP = 104;
const LEFT_PROCESS_PADDING = 56;
const RIGHT_PROCESS_PADDING = 64;
const TOP_MARGIN = 20;
const BOTTOM_MARGIN = 40;
const ROUTE_CLEARANCE = 10;
const ROUTE_CHANNEL_GAP = 12;
const RETURN_BUS_GAP = 16;
const RETURN_BUS_MARGIN = 28;
const FORWARD_DETOUR_TRACKS = 24;
const EDGE_LABEL_MIN_WIDTH = 48;
const EDGE_LABEL_MAX_WIDTH = 168;
const EDGE_LABEL_LINE_HEIGHT = 16;
const EDGE_LABEL_HORIZONTAL_PADDING = 16;
const EDGE_LABEL_VERTICAL_PADDING = 8;
const EDGE_LABEL_NODE_CLEARANCE = 12;
const EDGE_LABEL_LINE_CLEARANCE = 10;

type Bounds = { left: number; right: number; top: number; bottom: number };
type Point = { x: number; y: number };
type GatewayPortName = 'left' | 'right' | 'top' | 'bottom';
type GatewayPort = { name: GatewayPortName; point: Point };

const GATEWAY_PORT_SLOT_OFFSET = 12;

function isGatewayType(type?: string) {
  return ['decision-gateway', 'gateway', 'merge-gateway'].includes(type ?? '');
}

function gatewayPorts(position: PositionedNode) {
  const centerX = position.x + position.visualWidth / 2;
  const halfDiamond = position.visualWidth / 2;
  return {
    left: { x: centerX - halfDiamond, y: position.centerY },
    right: { x: centerX + halfDiamond, y: position.centerY },
    top: { x: centerX, y: position.centerY - halfDiamond },
    bottom: { x: centerX, y: position.centerY + halfDiamond },
  } satisfies Record<GatewayPortName, Point>;
}

function offsetGatewayPort(port: GatewayPort, slot: number): GatewayPort {
  if (!slot) return port;
  const offset = slot * GATEWAY_PORT_SLOT_OFFSET;
  return {
    name: port.name,
    point: port.name === 'left' || port.name === 'right'
      ? { x: port.point.x, y: port.point.y + offset }
      : { x: port.point.x + offset, y: port.point.y },
  };
}

function boundsIntersect(left: Bounds, right: Bounds) {
  return left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top;
}

function nodeContainerHeight(node: DiagramNode) {
  const lines = Math.max(1, Math.ceil((node.label?.length ?? 0) / 24));
  if (node.type === 'start-event' || node.type === 'end-event') return EVENT_DIAMETER + 12 + lines * 20;
  if (['decision-gateway', 'gateway', 'merge-gateway'].includes(node.type ?? '')) return GATEWAY_SIZE + 18 + lines * 20;
  return Math.max(NODE_HEIGHT, 44 + lines * 20);
}

function expanded(bounds: Bounds, clearance = ROUTE_CLEARANCE): Bounds {
  return { left: bounds.left - clearance, right: bounds.right + clearance, top: bounds.top - clearance, bottom: bounds.bottom + clearance };
}

function segmentIntersectsBounds(start: Point, end: Point, bounds: Bounds) {
  if (start.y === end.y) {
    const left = Math.min(start.x, end.x);
    const right = Math.max(start.x, end.x);
    return start.y > bounds.top && start.y < bounds.bottom && right > bounds.left && left < bounds.right;
  }
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);
  return start.x > bounds.left && start.x < bounds.right && bottom > bounds.top && top < bounds.bottom;
}

function routeIsClear(points: Point[], obstacles: Bounds[]) {
  return points.slice(1).every((point, index) => obstacles.every((obstacle) =>
    !segmentIntersectsBounds(points[index], point, expanded(obstacle))));
}

function pointsToPath(points: Point[]) {
  return points.map((point, index) => index === 0
    ? `M${point.x},${point.y}`
    : point.y === points[index - 1].y ? `H${point.x}` : `V${point.y}`).join(' ');
}

function compactPoints(points: Point[]) {
  return points.filter((point, index) => {
    if (!index || index === points.length - 1) return true;
    const previous = points[index - 1];
    const next = points[index + 1];
    return !((previous.x === point.x && point.x === next.x) || (previous.y === point.y && point.y === next.y));
  });
}

function routeLength(points: Point[]) {
  return points.slice(1).reduce((total, point, index) =>
    total + Math.abs(point.x - points[index].x) + Math.abs(point.y - points[index].y), 0);
}

function routeSegments(points: Point[]) {
  return points.slice(1).map((point, index) => ({ start: points[index], end: point }));
}

function segmentsCross(left: { start: Point; end: Point }, right: { start: Point; end: Point }) {
  const leftHorizontal = left.start.y === left.end.y;
  const rightHorizontal = right.start.y === right.end.y;
  if (leftHorizontal === rightHorizontal) return false;
  const horizontal = leftHorizontal ? left : right;
  const vertical = leftHorizontal ? right : left;
  const horizontalLeft = Math.min(horizontal.start.x, horizontal.end.x);
  const horizontalRight = Math.max(horizontal.start.x, horizontal.end.x);
  const verticalTop = Math.min(vertical.start.y, vertical.end.y);
  const verticalBottom = Math.max(vertical.start.y, vertical.end.y);
  return vertical.start.x > horizontalLeft && vertical.start.x < horizontalRight
    && horizontal.start.y > verticalTop && horizontal.start.y < verticalBottom;
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
  return toString(payload.diagramType) === 'business-process'
    && Array.isArray(payload.lanes)
    && Array.isArray(payload.nodes)
    && payload.nodes.length > 0
    && Array.isArray(payload.edges);
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
  if (process.env.NODE_ENV === 'development' && validEdges.length !== edges.length) {
    console.warn(`BusinessProcessDiagram ignored ${edges.length - validEdges.length} edge(s) with missing source or target nodes.`);
  }
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
  const positionedNodes: PositionedNode[] = nodes.map((node) => {
    const lane = laneLookup.get(node.laneId as string) ?? laneDefinitions[0];
    const rank = Math.max(0, nodeRanks.get(node.id) ?? 0);
    const rankGroup = nodesByLaneAndRank[lane.id];
    rankGroup[rank] = rankGroup[rank] ?? [];
    const rowIndex = rankGroup[rank].length;
    rankGroup[rank].push(node);
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
      obstacleLeft: 0,
      obstacleRight: 0,
      obstacleTop: 0,
      obstacleBottom: 0,
    };
  });

  const maxRank = Math.max(0, ...positionedNodes.map((entry) => entry.rank));
  const rankX: number[] = [LANE_LABEL_WIDTH + LEFT_PROCESS_PADDING];
  for (let rank = 1; rank <= maxRank; rank += 1) {
    let nextX = rankX[rank - 1] + MIN_RANK_STEP;
    validEdges.forEach((edge) => {
      if (!forwardEdgeIds.has(edge.id) || (nodeRanks.get(edge.target) ?? -1) !== rank) return;
      const sourceRank = Math.max(0, nodeRanks.get(edge.source) ?? 0);
      const source = nodeLookup.get(edge.source);
      const target = nodeLookup.get(edge.target);
      if (!source || !target || rankX[sourceRank] === undefined) return;
      const requiredGap = (visualDimensions(source.type).width + visualDimensions(target.type).width) / 2 + ROUTE_CLEARANCE * 2;
      nextX = Math.max(nextX, rankX[sourceRank] + requiredGap);
    });
    laneDefinitions.forEach((lane) => {
      if (!(nodesByLaneAndRank[lane.id]?.[rank]?.length)) return;
      for (let previous = rank - 1; previous >= 0; previous -= 1) {
        if (nodesByLaneAndRank[lane.id]?.[previous]?.length) {
          nextX = Math.max(nextX, rankX[previous] + NODE_WIDTH + MIN_HORIZONTAL_NODE_GAP);
          break;
        }
      }
    });
    rankX[rank] = nextX;
  }

  const returnEdges = validEdges.filter((edge) => backwardEdgeIds.has(edge.id));
  const returnAreaHeight = returnEdges.length ? RETURN_BUS_MARGIN * 2 + returnEdges.length * RETURN_BUS_GAP : 0;

  const laneLayouts: NodeLayout[] = laneDefinitions.map((lane) => {
    const rankGroups = Object.values(nodesByLaneAndRank[lane.id] ?? {});
    const tallestGroup = Math.max(0, ...rankGroups.map((group) =>
      group.reduce((height, node) => height + nodeContainerHeight(node), 0)
      + Math.max(0, group.length - 1) * NODE_SPACING_Y));
    const height = Math.max(MIN_LANE_HEIGHT, tallestGroup + LANE_INNER_PADDING * 2);
    return { lane, height, top: 0 };
  });

  let currentTop = TOP_MARGIN + returnAreaHeight;
  laneLayouts.forEach((layout) => {
    layout.top = currentTop;
    currentTop += layout.height;
  });

  const positionedNodesFinal = positionedNodes.map((entry) => {
    const laneLayout = laneLayouts.find((layout) => layout.lane.id === entry.lane.id)!;
    const dimensions = visualDimensions(entry.node.type);
    const columnX = rankX[entry.rank];
    const rankGroup = nodesByLaneAndRank[entry.lane.id]?.[entry.rank] ?? [entry.node];
    const rankGroupHeight = rankGroup.reduce((height, node) => height + nodeContainerHeight(node), 0)
      + Math.max(0, rankGroup.length - 1) * NODE_SPACING_Y;
    const precedingHeight = rankGroup.slice(0, entry.rowIndex).reduce((height, node) =>
      height + nodeContainerHeight(node) + NODE_SPACING_Y, 0);
    const containerHeight = nodeContainerHeight(entry.node);
    const containerTop = laneLayout.top + (laneLayout.height - rankGroupHeight) / 2 + precedingHeight;
    const isEvent = entry.node.type === 'start-event' || entry.node.type === 'end-event';
    const isGateway = ['decision-gateway', 'gateway', 'merge-gateway'].includes(entry.node.type ?? '');
    const centerY = containerTop + (isEvent ? EVENT_DIAMETER / 2 : isGateway ? GATEWAY_SIZE / 2 : containerHeight / 2);
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
      obstacleLeft: columnX,
      obstacleRight: columnX + NODE_WIDTH,
      obstacleTop: containerTop,
      obstacleBottom: containerTop + containerHeight,
    };
  });

  const maxNodeRight = Math.max(
    LANE_LABEL_WIDTH + LEFT_PROCESS_PADDING,
    ...positionedNodesFinal.map((entry) => entry.obstacleRight),
  );
  const canvasWidth = Math.max(760, maxNodeRight + RIGHT_PROCESS_PADDING);
  const canvasHeight = currentTop + BOTTOM_MARGIN + FORWARD_DETOUR_TRACKS * ROUTE_CHANNEL_GAP;

  const placedLabelBounds: Bounds[] = [];
  const nodeBounds = positionedNodesFinal.map((position) => isGatewayType(position.node.type) ? ({
    left: position.x,
    right: position.x + position.visualWidth,
    top: position.y,
    bottom: position.y + position.visualHeight,
  }) : ({
    left: position.obstacleLeft,
    right: position.obstacleRight,
    top: position.obstacleTop,
    bottom: position.obstacleBottom,
  }));
  const gatewayCaptionBounds = positionedNodesFinal.filter((position) =>
    ['decision-gateway', 'gateway', 'merge-gateway'].includes(position.node.type ?? '')).map((position) => ({
    left: position.obstacleLeft, right: position.obstacleRight,
    top: position.y + GATEWAY_EXTENT, bottom: position.obstacleBottom,
  }));

  const edgeInputOrder = new Map(validEdges.map((edge, index) => [edge.id, index]));
  const gatewayBranchOrder = new Map<string, number>();
  positionedNodesFinal.filter((position) => ['decision-gateway', 'gateway', 'merge-gateway'].includes(position.node.type ?? '')).forEach((position) => {
    const ordered = [...(outgoingEdges.get(position.node.id) ?? [])].sort((left, right) => {
      const leftTarget = positionedNodesFinal.find((entry) => entry.node.id === left.target)!;
      const rightTarget = positionedNodesFinal.find((entry) => entry.node.id === right.target)!;
      const laneDifference = laneDefinitions.findIndex((lane) => lane.id === leftTarget.lane.id)
        - laneDefinitions.findIndex((lane) => lane.id === rightTarget.lane.id);
      return laneDifference || leftTarget.centerY - rightTarget.centerY
        || (edgeInputOrder.get(left.id) ?? 0) - (edgeInputOrder.get(right.id) ?? 0);
    });
    ordered.forEach((edge, index) => gatewayBranchOrder.set(edge.id, index));
  });
  const returnEdgeIndexes = new Map(returnEdges.map((edge, index) => [edge.id, index]));
  const downstreamDepth = new Map(nodes.map((node) => [node.id, 0]));
  [...topologicalOrder].reverse().forEach((node) => {
    const depths = (outgoingEdges.get(node.id) ?? []).filter((edge) => forwardEdgeIds.has(edge.id))
      .map((edge) => (downstreamDepth.get(edge.target) ?? 0) + 1);
    downstreamDepth.set(node.id, Math.max(0, ...depths));
  });
  const gatewaySourcePorts = new Map<string, GatewayPort>();
  positionedNodesFinal.filter((position) => isGatewayType(position.node.type)).forEach((position) => {
    const outgoing = [...(outgoingEdges.get(position.node.id) ?? [])];
    if (!outgoing.length) return;
    const ports = gatewayPorts(position);
    const continuationCandidates = outgoing.filter((edge) => {
      const target = nodeLookup.get(edge.target);
      return target?.type !== 'exception' && target?.type !== 'error'
        && !/(error|invalid|denied|ineligible|not-found|cancel)/i.test(target?.id ?? '');
    });
    const primaryCandidates = continuationCandidates.length ? continuationCandidates : outgoing;
    const primaryDepth = Math.max(...primaryCandidates.map((edge) => downstreamDepth.get(edge.target) ?? 0));
    const primary = primaryCandidates.find((edge) => (downstreamDepth.get(edge.target) ?? 0) === primaryDepth) ?? primaryCandidates[0];
    gatewaySourcePorts.set(primary.id, { name: 'right', point: ports.right });

    const alternatives = outgoing.filter((edge) => edge.id !== primary.id).sort((left, right) =>
      (gatewayBranchOrder.get(left.id) ?? 0) - (gatewayBranchOrder.get(right.id) ?? 0));
    alternatives.forEach((edge, index) => {
      const target = positionedNodesFinal.find((entry) => entry.node.id === edge.target)!;
      let name: GatewayPortName = target.centerY < position.centerY ? 'top' : 'bottom';
      if (outgoing.length > 2 && Math.abs(target.centerY - position.centerY) < ROUTE_CHANNEL_GAP) {
        name = index % 2 ? 'bottom' : 'top';
      }
      const sameSideIndex = alternatives.slice(0, index).filter((candidate) => {
        const candidateTarget = positionedNodesFinal.find((entry) => entry.node.id === candidate.target)!;
        return (candidateTarget.centerY < position.centerY ? 'top' : 'bottom') === name;
      }).length;
      const signedSlot = sameSideIndex ? Math.ceil(sameSideIndex / 2) * (sameSideIndex % 2 ? 1 : -1) : 0;
      gatewaySourcePorts.set(edge.id, offsetGatewayPort({ name, point: ports[name] }, signedSlot));
    });
  });
  const forwardGuideSegments = validEdges.filter((edge) => forwardEdgeIds.has(edge.id)).flatMap((edge) => {
    const source = positionedNodesFinal.find((position) => position.node.id === edge.source)!;
    const target = positionedNodesFinal.find((position) => position.node.id === edge.target)!;
    const sourcePoint = { x: source.anchorRight, y: source.centerY };
    const targetPoint = { x: target.anchorLeft, y: target.centerY };
    const x = (sourcePoint.x + targetPoint.x) / 2;
    return routeSegments(compactPoints([sourcePoint, { x, y: sourcePoint.y }, { x, y: targetPoint.y }, targetPoint]));
  });
  const edgeLayouts = validEdges.map((edge, edgeIndex) => {
    const sourceNode = nodeLookup.get(edge.source)!;
    const targetNode = nodeLookup.get(edge.target)!;
    const sourcePosition = positionedNodesFinal.find((entry) => entry.node.id === sourceNode.id)!;
    const targetPosition = positionedNodesFinal.find((entry) => entry.node.id === targetNode.id)!;
    const sourcePort = gatewaySourcePorts.get(edge.id);
    const sourcePoint = sourcePort?.point ?? { x: sourcePosition.anchorRight, y: sourcePosition.centerY };
    const targetPort: GatewayPortName = 'left';
    const targetPoint = isGatewayType(targetPosition.node.type)
      ? gatewayPorts(targetPosition).left
      : { x: targetPosition.anchorLeft, y: targetPosition.centerY };
    const isReturn = backwardEdgeIds.has(edge.id);
    const isCrossLane = sourcePosition.lane.id !== targetPosition.lane.id;
    const isGatewayOutgoing = ['decision-gateway', 'gateway', 'merge-gateway'].includes(sourcePosition.node.type ?? '');
    const gatewayDepths = (outgoingEdges.get(edge.source) ?? []).filter((candidate) => forwardEdgeIds.has(candidate.id))
      .map((candidate) => downstreamDepth.get(candidate.target) ?? 0);
    const edgePriority = isReturn ? 'exception'
      : isGatewayOutgoing && (downstreamDepth.get(edge.target) ?? 0) < Math.max(0, ...gatewayDepths) ? 'alternative'
        : 'primary';
    const labelText = edge.condition ?? edge.label;

    let routePoints: Point[] = [];
    let returnY: number | undefined;
    let routeTrack = 0;
    let returnScope: 'none' | 'local' | 'external' = 'none';
    const obstacles = positionedNodesFinal
      .filter((position) => position.node.id !== edge.source && position.node.id !== edge.target)
      .map((position) => ({ left: position.obstacleLeft, right: position.obstacleRight, top: position.obstacleTop, bottom: position.obstacleBottom }));

    if (!isReturn) {
      const sourceIndex = gatewayBranchOrder.get(edge.id)
        ?? (outgoingEdges.get(edge.source) ?? []).findIndex((candidate) => candidate.id === edge.id);
      const minimumX = sourcePoint.x + ROUTE_CLEARANCE + sourceIndex * ROUTE_CHANNEL_GAP;
      const maximumX = targetPoint.x - ROUTE_CLEARANCE;
      const middle = (minimumX + maximumX) / 2;
      const xCandidates = Array.from({ length: Math.max(1, Math.floor((maximumX - minimumX) / ROUTE_CHANNEL_GAP) + 1) }, (_, index) => {
        if (!index) return middle;
        const distance = Math.ceil(index / 2) * ROUTE_CHANNEL_GAP;
        return middle + (index % 2 ? distance : -distance);
      }).filter((x) => x >= minimumX && x <= maximumX);
      const directCandidates = xCandidates.map((x) => ({ points: compactPoints([sourcePoint, { x, y: sourcePoint.y }, { x, y: targetPoint.y }, targetPoint]), x }));
      let selected = directCandidates.find((candidate) => routeIsClear(candidate.points, obstacles));
      if (!selected) {
        const yCandidates = [...new Set([
          ...laneLayouts.flatMap((layout) => [layout.top - ROUTE_CHANNEL_GAP, layout.top + layout.height + ROUTE_CHANNEL_GAP]),
          ...obstacles.flatMap((obstacle) => [obstacle.top - ROUTE_CHANNEL_GAP, obstacle.bottom + ROUTE_CHANNEL_GAP]),
        ])].filter((y) => y > returnAreaHeight && y < canvasHeight - BOTTOM_MARGIN / 2);
        const exitCandidates = [...new Set([minimumX, ...xCandidates])];
        const entryCandidates = [...new Set([maximumX, ...xCandidates])].reverse();
        outer: for (const y of yCandidates) {
          for (const exitX of exitCandidates) {
            for (const entryX of entryCandidates) {
              if (entryX < exitX) continue;
              const points = compactPoints([
                sourcePoint, { x: exitX, y: sourcePoint.y }, { x: exitX, y },
                { x: entryX, y }, { x: entryX, y: targetPoint.y }, targetPoint,
              ]);
              if (routeIsClear(points, obstacles)) {
                selected = { points, x: exitX };
                break outer;
              }
            }
          }
        }
      }
      if (!selected) {
        const y = currentTop + BOTTOM_MARGIN / 2 + (edgeIndex % FORWARD_DETOUR_TRACKS) * ROUTE_CHANNEL_GAP;
        const allX = Array.from({ length: Math.floor((canvasWidth - LANE_LABEL_WIDTH) / ROUTE_CHANNEL_GAP) }, (_, index) =>
          LANE_LABEL_WIDTH + ROUTE_CHANNEL_GAP + index * ROUTE_CHANNEL_GAP);
        const exitX = allX.find((x) => routeIsClear([sourcePoint, { x, y: sourcePoint.y }, { x, y }], obstacles));
        const entryX = allX.find((x) => routeIsClear([{ x, y }, { x, y: targetPoint.y }, targetPoint], obstacles));
        if (exitX !== undefined && entryX !== undefined) {
          const points = compactPoints([
            sourcePoint, { x: exitX, y: sourcePoint.y }, { x: exitX, y },
            { x: entryX, y }, { x: entryX, y: targetPoint.y }, targetPoint,
          ]);
          selected = { points, x: exitX };
          routeTrack = edgeIndex % FORWARD_DETOUR_TRACKS;
        }
      }
      routePoints = selected?.points ?? compactPoints([sourcePoint, { x: middle, y: sourcePoint.y }, { x: middle, y: targetPoint.y }, targetPoint]);
    } else {
      routeTrack = returnEdgeIndexes.get(edge.id) ?? 0;
      const rankDistance = Math.abs(sourcePosition.rank - targetPosition.rank);
      const localLeft = Math.min(sourcePosition.obstacleLeft, targetPosition.obstacleLeft);
      const localRight = Math.max(sourcePosition.obstacleRight, targetPosition.obstacleRight);
      const localObstacles = positionedNodesFinal.filter((position) =>
        position.obstacleRight >= localLeft && position.obstacleLeft <= localRight);
      const localYCandidates = [...new Set(localObstacles.flatMap((position) =>
        [position.obstacleTop - ROUTE_CHANNEL_GAP, position.obstacleBottom + ROUTE_CHANNEL_GAP]))]
        .filter((y) => y > returnAreaHeight && y < currentTop)
        .sort((left, right) => Math.abs(left - sourcePoint.y) - Math.abs(right - sourcePoint.y));
      const exitCandidates = Array.from({ length: 12 }, (_, index) => sourcePoint.x + 20 + index * ROUTE_CHANNEL_GAP);
      const entryCandidates = Array.from({ length: 12 }, (_, index) => targetPoint.x - 20 - index * ROUTE_CHANNEL_GAP);
      const localCandidates = localYCandidates.flatMap((y) => exitCandidates.flatMap((exitX) =>
        entryCandidates.map((entryX) => compactPoints([
          sourcePoint, { x: exitX, y: sourcePoint.y }, { x: exitX, y },
          { x: entryX, y }, { x: entryX, y: targetPoint.y }, targetPoint,
        ]))))
        .filter((points) => routeIsClear(points, obstacles))
        .map((points) => ({
          points,
          score: routeLength(points) + Math.max(0, points.length - 2) * 56
            + routeSegments(points).reduce((count, segment) =>
              count + forwardGuideSegments.filter((guide) => segmentsCross(segment, guide)).length, 0) * 10_000
            + Math.abs((Math.min(...points.map((point) => point.x)) + Math.max(...points.map((point) => point.x))) / 2 - (localLeft + localRight) / 2),
        }))
        .sort((left, right) => left.score - right.score);
      const localBounds = {
        left: Math.min(...localObstacles.map((position) => position.obstacleLeft)),
        right: Math.max(...localObstacles.map((position) => position.obstacleRight)),
        top: Math.min(...localObstacles.map((position) => position.obstacleTop)),
        bottom: Math.max(...localObstacles.map((position) => position.obstacleBottom)),
      };
      const enclosureCandidates = [localBounds.top - ROUTE_CHANNEL_GAP * 2, localBounds.bottom + ROUTE_CHANNEL_GAP * 2].map((y) =>
        compactPoints([
          sourcePoint, { x: localBounds.right + ROUTE_CHANNEL_GAP * 2, y: sourcePoint.y },
          { x: localBounds.right + ROUTE_CHANNEL_GAP * 2, y }, { x: localBounds.left - ROUTE_CHANNEL_GAP * 2, y },
          { x: localBounds.left - ROUTE_CHANNEL_GAP * 2, y: targetPoint.y }, targetPoint,
        ])).filter((points) => routeIsClear(points, obstacles));
      const selectedLocal = localCandidates[0]?.points ?? enclosureCandidates[0];
      if (selectedLocal && rankDistance <= 8) {
        routePoints = selectedLocal;
        returnY = routePoints[2]?.y;
        returnScope = 'local';
      } else {
        returnY = TOP_MARGIN + RETURN_BUS_MARGIN + routeTrack * RETURN_BUS_GAP;
        const allX = Array.from({ length: Math.floor((canvasWidth - LANE_LABEL_WIDTH) / ROUTE_CHANNEL_GAP) }, (_, index) =>
          LANE_LABEL_WIDTH + ROUTE_CHANNEL_GAP + index * ROUTE_CHANNEL_GAP);
        const exitX = allX.find((x) => routeIsClear([sourcePoint, { x, y: sourcePoint.y }, { x, y: returnY! }], obstacles));
        const entryX = allX.find((x) => routeIsClear([{ x, y: returnY! }, { x, y: targetPoint.y }, targetPoint], obstacles));
        routePoints = compactPoints([
          sourcePoint, { x: exitX ?? sourcePoint.x + 20, y: sourcePoint.y }, { x: exitX ?? sourcePoint.x + 20, y: returnY },
          { x: entryX ?? targetPoint.x - 20, y: returnY }, { x: entryX ?? targetPoint.x - 20, y: targetPoint.y }, targetPoint,
        ]);
        returnScope = 'external';
      }
    }
    const path = pointsToPath(routePoints);

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
      const gatewayRightLabelLeft = Math.max(
        sourcePoint.x + EDGE_LABEL_NODE_CLEARANCE,
        sourcePosition.obstacleRight + EDGE_LABEL_NODE_CLEARANCE,
      );
      const gatewayPortCandidate = sourcePort?.name === 'top' ? {
        left: sourcePoint.x - size.width / 2,
        right: sourcePoint.x + size.width / 2,
        top: sourcePoint.y - size.height - EDGE_LABEL_NODE_CLEARANCE,
        bottom: sourcePoint.y - EDGE_LABEL_NODE_CLEARANCE,
      } : sourcePort?.name === 'bottom' ? {
        left: sourcePoint.x - size.width / 2,
        right: sourcePoint.x + size.width / 2,
        top: sourcePoint.y + EDGE_LABEL_NODE_CLEARANCE,
        bottom: sourcePoint.y + EDGE_LABEL_NODE_CLEARANCE + size.height,
      } : {
        left: gatewayRightLabelLeft,
        right: gatewayRightLabelLeft + size.width,
        top: sourcePoint.y - size.height - EDGE_LABEL_LINE_CLEARANCE,
        bottom: sourcePoint.y - EDGE_LABEL_LINE_CLEARANCE,
      };
      const horizontalSegments = routePoints.slice(1).map((point, index) => ({ start: routePoints[index], end: point }))
        .filter(({ start, end }) => start.y === end.y)
        .sort((left, right) => Math.abs(right.end.x - right.start.x) - Math.abs(left.end.x - left.start.x));
      const segmentCandidates = horizontalSegments.flatMap(({ start, end }) =>
        Array.from({ length: 8 }, (_, offsetIndex) => {
          const distance = EDGE_LABEL_LINE_CLEARANCE + offsetIndex * ROUTE_CHANNEL_GAP;
          const above = offsetIndex % 2 === 0;
          const top = above ? start.y - size.height - distance : start.y + distance;
          return {
            left: (start.x + end.x - size.width) / 2,
            right: (start.x + end.x + size.width) / 2,
            top,
            bottom: top + size.height,
          };
        }));
      const aboveReturn = {
        left: (sourcePoint.x + targetPoint.x - size.width) / 2,
        right: (sourcePoint.x + targetPoint.x + size.width) / 2,
        top: (returnY ?? sourcePoint.y) - size.height - EDGE_LABEL_LINE_CLEARANCE,
        bottom: (returnY ?? sourcePoint.y) - EDGE_LABEL_LINE_CLEARANCE,
      };
      const candidates = isReturn
        ? [...segmentCandidates, aboveReturn, aboveSource, aboveTarget, belowSource]
        : isGatewayOutgoing
          ? [gatewayPortCandidate, aboveSource, belowSource, ...segmentCandidates, aboveTarget]
          : isCrossLane
            ? [...segmentCandidates, aboveSource, aboveTarget, belowSource]
            : [...segmentCandidates, centeredAbove, aboveSource, aboveTarget, belowSource];
      const normalizedCandidates = candidates.map((candidate) =>
        clampLabelBounds(candidate, canvasWidth, canvasHeight));
      const labelObstacles = [...nodeBounds, ...gatewayCaptionBounds, ...placedLabelBounds];
      labelBounds = normalizedCandidates.find((candidate) =>
        labelObstacles.every((obstacle) => !boundsIntersect(candidate, obstacle)));
      if (!labelBounds) {
        labelBounds = normalizedCandidates
          .map((candidate) => ({
            candidate,
            collisions: labelObstacles.filter((obstacle) => boundsIntersect(candidate, obstacle)).length,
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
      routePoints,
      routeTrack,
      returnScope,
      routeLength: routeLength(routePoints),
      edgePriority,
      sourcePort: sourcePort?.name ?? 'right',
      targetPort,
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
              <marker id="bpmn-return-arrowhead" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#9f5353" />
              </marker>
            </defs>
            {edgeLayouts.map((layout) => (
              <g key={layout.edge.id}>
                <path
                  data-edge-id={layout.edge.id}
                  data-edge-return={String(layout.isReturn)}
                  data-edge-cross-lane={String(layout.isCrossLane)}
                  data-edge-gateway-outgoing={String(layout.isGatewayOutgoing)}
                  data-edge-route-track={layout.routeTrack}
                  data-edge-return-scope={layout.returnScope}
                  data-edge-route-length={layout.routeLength}
                  data-edge-priority={layout.edgePriority}
                  data-edge-source-port={layout.sourcePort}
                  data-edge-target-port={layout.targetPort}
                  data-edge-route-clear={String(routeIsClear(layout.routePoints, nodeBounds.filter((_, index) => {
                    const nodeId = positionedNodesFinal[index].node.id;
                    return nodeId !== layout.edge.source && nodeId !== layout.edge.target;
                  })))}
                  data-edge-source-x={layout.sourcePoint.x}
                  data-edge-source-y={layout.sourcePoint.y}
                  data-edge-target-x={layout.targetPoint.x}
                  data-edge-target-y={layout.targetPoint.y}
                  d={layout.path}
                  fill="none"
                  stroke={layout.isReturn ? '#9f5353' : layout.edgePriority === 'alternative' ? '#64748b' : '#0f172a'}
                  strokeWidth={layout.isReturn ? '1.75' : layout.edgePriority === 'alternative' ? '1.8' : '2.25'}
                  strokeOpacity={layout.isReturn ? '0.68' : layout.edgePriority === 'alternative' ? '0.82' : '1'}
                  strokeDasharray={layout.isReturn ? '6 5' : undefined}
                  markerEnd={layout.isReturn ? 'url(#bpmn-return-arrowhead)' : 'url(#bpmn-arrowhead)'}
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
                  data-node-left={positioned.obstacleLeft}
                  data-node-right={positioned.obstacleRight}
                  data-node-top={positioned.obstacleTop}
                  data-node-bottom={positioned.obstacleBottom}
                  data-anchor-left={positioned.anchorLeft}
                  data-anchor-right={positioned.anchorRight}
                  data-port-left-x={isGateway ? gatewayPorts(positioned).left.x : undefined}
                  data-port-left-y={isGateway ? gatewayPorts(positioned).left.y : undefined}
                  data-port-right-x={isGateway ? gatewayPorts(positioned).right.x : undefined}
                  data-port-right-y={isGateway ? gatewayPorts(positioned).right.y : undefined}
                  data-port-top-x={isGateway ? gatewayPorts(positioned).top.x : undefined}
                  data-port-top-y={isGateway ? gatewayPorts(positioned).top.y : undefined}
                  data-port-bottom-x={isGateway ? gatewayPorts(positioned).bottom.x : undefined}
                  data-port-bottom-y={isGateway ? gatewayPorts(positioned).bottom.y : undefined}
                  data-gateway-shape-bottom={isGateway ? positioned.obstacleTop + GATEWAY_SIZE : undefined}
                  data-gateway-label-top={isGateway ? positioned.obstacleTop + GATEWAY_SIZE + 18 : undefined}
                  role="group"
                  aria-label={`${node.label}, ${shape.label}, ${laneName}`}
                  className="absolute"
                  style={{
                    left: `${positioned.columnX}px`,
                    top: `${positioned.obstacleTop}px`,
                    width: `${NODE_WIDTH}px`,
                    minHeight: `${positioned.obstacleBottom - positioned.obstacleTop}px`,
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
