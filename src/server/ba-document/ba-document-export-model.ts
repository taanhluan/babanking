import type { BaDocumentContentV1 } from './ba-document-domain';
import { buildSameDocumentReferenceIndex } from './ba-document-traceability';

export type ExportLocale = 'en' | 'vi';
export type ExportBlock = {
  id: string;
  type: string;
  title?: string;
  paragraphs: string[];
  headers?: string[];
  rows?: string[][];
};
export type ExportArtifact = {
  id: string;
  title: string;
  fields: Array<{ label: string; value: string | string[] }>;
};
export type BaDocumentExportModel = {
  sourceRevisionId: string;
  locale: ExportLocale;
  metadata: {
    documentCode: string;
    documentType: string;
    title: string;
    summary: string;
    primaryJourney: string;
    version: number;
    status: 'PUBLISHED';
    publishedAt?: string;
    lastUpdated: string;
  };
  revisionHistory: Array<{
    version: number;
    date?: string;
    changeSummary?: string;
    authorOrPublisher?: string;
  }>;
  modules: Array<{
    id: string;
    order: number;
    title: string;
    summary?: string;
    sections: Array<{
      id: string;
      order: number;
      title: string;
      summary?: string;
      blocks: ExportBlock[];
    }>;
  }>;
  artifactGroups: Array<{ key: string; title: string; items: ExportArtifact[] }>;
  traceability: Array<{
    requirement: string;
    businessRules: string[];
    validations: string[];
    processes: string[];
    acceptanceCriteria: string[];
    uat: string[];
    integrity: 'VALID' | 'BROKEN';
  }>;
};

type ArtifactRecord = Record<string, unknown> & { id: string; title?: string; name?: string };

const groupDefinitions = [
  ['requirements', 'Business Requirements'],
  ['businessRules', 'Business Rules'],
  ['validations', 'Validations'],
  ['processes', 'Processes'],
  ['dataElements', 'Data Requirements'],
  ['dataMappings', 'Data Mapping'],
  ['acceptanceCriteria', 'Acceptance Criteria'],
  ['uatScenarios', 'UAT Scenarios'],
  ['decisions', 'Decisions'],
] as const;

const hiddenArtifactFields = new Set(['id', 'title', 'name']);
const label = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());

function readable(value: unknown): string | string[] | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const values = value.map((entry) => {
      if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        return [record.name ?? record.title ?? record.action ?? record.id, record.description ?? record.expectedResult]
          .filter(Boolean).map(String).join(': ');
      }
      return String(entry);
    }).filter(Boolean);
    return values.length ? values : undefined;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const parts = Object.entries(record).flatMap(([key, entry]) => {
      const rendered = readable(entry);
      return rendered ? [`${label(key)}: ${Array.isArray(rendered) ? rendered.join('; ') : rendered}`] : [];
    });
    return parts.length ? parts : undefined;
  }
  return undefined;
}

function normalizeBlock(block: BaDocumentContentV1['modules'][number]['sections'][number]['blocks'][number]): ExportBlock {
  const payload = block.payload;
  const title = typeof payload.title === 'string' ? payload.title : undefined;
  if (block.blockType === 'TABLE') {
    const rawHeaders = payload.headers ?? payload.columns;
    const headers = Array.isArray(rawHeaders) ? rawHeaders.map(String) : [];
    const rawRows = Array.isArray(payload.rows) ? payload.rows : [];
    const rows = rawRows.map((row) => (Array.isArray(row) ? row : Object.values((row && typeof row === 'object') ? row as Record<string, unknown> : {})).map((cell) => {
      const value = readable(cell);
      return Array.isArray(value) ? value.join('; ') : value ?? '';
    }));
    return { id: block.id, type: block.blockType, title, paragraphs: [], headers, rows };
  }
  const primary = payload.text ?? payload.content ?? payload.description ?? payload.value;
  const list = payload.items ?? payload.values ?? payload.list ?? payload.steps ?? payload.nodes;
  const paragraphs = [readable(primary), readable(list)].flatMap((value) => value == null ? [] : Array.isArray(value) ? value : [value]);
  if (!paragraphs.length) {
    const fallback = readable(payload);
    paragraphs.push(...(fallback == null ? [] : Array.isArray(fallback) ? fallback : [fallback]));
  }
  return { id: block.id, type: block.blockType, title, paragraphs };
}

function normalizeArtifact(item: ArtifactRecord): ExportArtifact {
  return {
    id: item.id,
    title: item.title ?? item.name ?? 'Untitled',
    fields: Object.entries(item).flatMap(([key, value]) => {
      if (hiddenArtifactFields.has(key)) return [];
      const rendered = readable(value);
      return rendered == null ? [] : [{ label: label(key), value: rendered }];
    }),
  };
}

export function buildBaDocumentExportModel(input: {
  content: BaDocumentContentV1;
  sourceRevisionId: string;
  locale: ExportLocale;
  primaryJourney: string;
  version: number;
  publishedAt?: Date | null;
  updatedAt: Date;
  authorOrPublisher?: string | null;
}): BaDocumentExportModel {
  const { content } = input;
  const artifactGroups = groupDefinitions.flatMap(([key, title]) => {
    const items = (content.artifacts[key] ?? []) as ArtifactRecord[];
    return items.length ? [{ key, title, items: items.map(normalizeArtifact) }] : [];
  });
  const trace = buildSameDocumentReferenceIndex(content).requirementTraceRows;
  return {
    sourceRevisionId: input.sourceRevisionId,
    locale: input.locale,
    metadata: {
      documentCode: content.metadata.documentCode,
      documentType: content.documentType,
      title: content.metadata.title,
      summary: content.metadata.summary,
      primaryJourney: input.primaryJourney,
      version: input.version,
      status: 'PUBLISHED',
      publishedAt: input.publishedAt?.toISOString(),
      lastUpdated: input.updatedAt.toISOString(),
    },
    revisionHistory: [{
      version: input.version,
      date: input.publishedAt?.toISOString(),
      changeSummary: content.metadata.changeSummary,
      authorOrPublisher: input.authorOrPublisher ?? undefined,
    }],
    modules: [...content.modules].sort((a, b) => a.order - b.order).map((module) => ({
      id: module.id, order: module.order, title: module.title, summary: module.summary,
      sections: [...module.sections].sort((a, b) => a.order - b.order).map((section) => ({
        id: section.id, order: section.order, title: section.title, summary: section.summary,
        blocks: section.blocks.map(normalizeBlock),
      })),
    })),
    artifactGroups,
    traceability: trace.map((row) => ({
      requirement: row.requirementId,
      businessRules: row.businessRuleRefs,
      validations: row.validationRefs,
      processes: row.processRefs,
      acceptanceCriteria: row.acceptanceCriteriaRefs,
      uat: row.uatRefs,
      integrity: row.broken.length ? 'BROKEN' : 'VALID',
    })),
  };
}

export function buildBaDocumentExportFilename(model: BaDocumentExportModel, format: 'docx' | 'pdf') {
  const clean = (value: string) => value.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'BA-Document';
  return `${clean(model.metadata.documentCode)}_${clean(model.metadata.title)}_v${model.metadata.version}.${format}`;
}
