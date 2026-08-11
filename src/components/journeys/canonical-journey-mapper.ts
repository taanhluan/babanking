export type CanonicalBlock = {
  id: string;
  blockType: string;
  schemaVersion?: number;
  payload: unknown;
};

export type CanonicalState = {
  id: string;
  title: string;
  summary?: string;
  blocks: CanonicalBlock[];
  children: CanonicalState[];
};

export type CanonicalStage = {
  id: string;
  title: string;
  summary?: string;
  states: CanonicalState[];
};

export type CanonicalJourney = {
  id: string;
  title: string;
  summary?: string;
  stages: CanonicalStage[];
};

export type CanonicalStageSource = Record<string, unknown> & { statePrefix?: string };

export type CanonicalJourneySource = {
  id?: unknown;
  key?: unknown;
  title: string;
  summary?: string;
  stages: CanonicalStageSource[];
};

const diagramKeys = ['diagramType', 'orientation', 'title', 'description', 'lanes', 'nodes', 'edges'] as const;

export const asCanonicalRecord = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value)
  ? value as Record<string, unknown>
  : {};

export const canonicalText = (value: unknown, keys: string[]) => {
  const source = asCanonicalRecord(value);
  for (const key of keys) if (typeof source[key] === 'string') return source[key] as string;
  return undefined;
};

export const canonicalId = (value: unknown, fallback: string) => String(value || fallback)
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '') || fallback;

export const canonicalStringList = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string')
  : [];

function normalizedBlockPayload(raw: Record<string, unknown>) {
  const nested = asCanonicalRecord(raw.payload);
  const diagramData = Object.fromEntries(diagramKeys.flatMap((key) => {
    const value = nested[key] ?? raw[key];
    return value === undefined ? [] : [[key, value]];
  }));
  return diagramData.diagramType === 'business-process' ? diagramData : raw.payload;
}

function hasBusinessProcessData(value: unknown) {
  const data = asCanonicalRecord(value);
  return data.diagramType === 'business-process'
    && Array.isArray(data.lanes)
    && Array.isArray(data.nodes)
    && data.nodes.length > 0
    && Array.isArray(data.edges);
}

export function normalizeCanonicalBlock(raw: Record<string, unknown>, fallback: string): CanonicalBlock {
  const payload = normalizedBlockPayload(raw);
  const declaredType = typeof raw.blockType === 'string' ? raw.blockType : 'RICH_TEXT';
  const recoverableDiagramWrapper = ['DIAGRAM', 'RICH_TEXT', 'TEXT'].includes(declaredType.toUpperCase());
  return {
    id: canonicalId(raw.id || raw.key, fallback),
    blockType: recoverableDiagramWrapper && hasBusinessProcessData(payload) ? 'DIAGRAM' : declaredType,
    schemaVersion: typeof raw.schemaVersion === 'number' ? raw.schemaVersion : undefined,
    payload,
  };
}

function uniqueId(value: string, used: Set<string>) {
  let candidate = value;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${value}-${suffix++}`;
  used.add(candidate);
  return candidate;
}

export function normalizeCanonicalStates(rawStates: unknown[], prefix: string, used = new Set<string>()): CanonicalState[] {
  return rawStates.map((raw, index) => {
    const value = asCanonicalRecord(raw);
    const childrenRaw = Array.isArray(value.children) ? value.children : Array.isArray(value.states) ? value.states : [];
    const stateId = uniqueId(canonicalId(value.id || value.key || canonicalText(value.payload, ['title', 'label', 'name']), `${prefix}-${index + 1}`), used);
    return {
      id: stateId,
      title: canonicalText(value, ['title', 'label', 'name'])
        || canonicalText(value.payload, ['title', 'label', 'name'])
        || String(value.id || value.key || `State ${index + 1}`),
      summary: canonicalText(value, ['summary', 'description'])
        || canonicalText(value.payload, ['summary', 'description']),
      blocks: [normalizeCanonicalBlock(value, `${prefix}-${index + 1}`)],
      children: normalizeCanonicalStates(childrenRaw, stateId, used),
    };
  });
}

export function mapCanonicalJourney(source: CanonicalJourneySource): CanonicalJourney {
  const usedStageIds = new Set<string>();
  const stages = source.stages.map((raw, index) => {
    const id = uniqueId(canonicalId(raw.id || raw.key || raw.title, `stage-${index + 1}`), usedStageIds);
    const states = Array.isArray(raw.states) ? raw.states : Array.isArray(raw.blocks) ? raw.blocks : [];
    return {
      id,
      title: canonicalText(raw, ['title', 'label', 'name']) || `Stage ${index + 1}`,
      summary: canonicalText(raw, ['summary', 'description']),
      states: normalizeCanonicalStates(states, typeof raw.statePrefix === 'string' ? raw.statePrefix : id),
    };
  });
  return {
    id: canonicalId(source.id || source.key || source.title, 'journey'),
    title: source.title,
    summary: source.summary,
    stages,
  };
}
