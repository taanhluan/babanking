import {
  asCanonicalRecord,
  canonicalId,
  canonicalText,
  normalizeCanonicalBlock,
  type CanonicalJourney,
  type CanonicalStage,
  type CanonicalState,
} from './canonical-journey-mapper';

function records(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function uniqueId(value: string, used: Set<string>) {
  let candidate = value;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${value}-${suffix++}`;
  used.add(candidate);
  return candidate;
}

export function isCanonicalStructuredJourneyContent(body: unknown) {
  const content = asCanonicalRecord(body);
  const metadata = asCanonicalRecord(content.metadata);
  const modules = records(content.modules);
  return metadata.journeyReader === 'canonical'
    && typeof content.title === 'string'
    && modules.length > 0
    && modules.every((module) => typeof module.title === 'string'
      && records(module.sections).length > 0
      && records(module.sections).every((section) => typeof section.title === 'string'
        && Array.isArray(section.blocks)
        && records(section.blocks).length === section.blocks.length
        && records(section.blocks).every((entry) => typeof entry.blockType === 'string')));
}

export function mapStructuredJourneyToCanonical(body: unknown): CanonicalJourney {
  if (!isCanonicalStructuredJourneyContent(body)) throw new Error('Canonical structured Journey content is invalid.');
  const content = asCanonicalRecord(body);
  const usedStageIds = new Set<string>();
  const stages: CanonicalStage[] = records(content.modules).map((module, moduleIndex) => {
    const stageId = uniqueId(canonicalId(module.id || module.key || module.title, `stage-${moduleIndex + 1}`), usedStageIds);
    const usedStateIds = new Set<string>();
    const states: CanonicalState[] = records(module.sections).map((section, sectionIndex) => {
      const stateId = uniqueId(canonicalId(section.id || section.key || section.title, `${stageId}-${sectionIndex + 1}`), usedStateIds);
      return {
        id: stateId,
        title: String(section.title),
        summary: canonicalText(section, ['summary', 'description']),
        blocks: records(section.blocks).map((entry, blockIndex) => normalizeCanonicalBlock(entry, `${stateId}-block-${blockIndex + 1}`)),
        children: [],
      };
    });
    return {
      id: stageId,
      title: String(module.title),
      summary: canonicalText(module, ['summary', 'description']),
      states,
    };
  });
  return {
    id: canonicalId(content.slug || content.title, 'journey'),
    title: String(content.title),
    summary: typeof content.summary === 'string' ? content.summary : undefined,
    stages,
  };
}
