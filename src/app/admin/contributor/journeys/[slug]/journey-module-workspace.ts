export type WorkspaceBlock = { blockType: string; payload: Record<string, unknown> };
export type WorkspaceSection = { title: string; key?: string; blocks: WorkspaceBlock[] };

function textOf(value: WorkspaceBlock | WorkspaceSection) {
  if ('blocks' in value) return `${value.title} ${value.key ?? ''}`.toLowerCase();
  return `${value.blockType} ${Object.entries(value.payload).filter(([, item]) => typeof item === 'string').map(([, item]) => item).join(' ')}`.toLowerCase();
}

export function isLifecycleSection(section: WorkspaceSection) {
  return /^(overview|journey overview|initiation|validation|compliance|compliance and risk|fraud|fraud and aml|authorization|execution|internal posting|clearing|settlement|completion|reconciliation|exception|exception and reversal|related knowledge)$/i.test(section.title.trim()) || /^(initiation|validation|compliance|authorization|execution|settlement|completion|reconciliation)$/.test(section.key ?? '');
}

export function classifyWorkspaceBlock(block: WorkspaceBlock): 'rules' | 'apis' | 'exceptions' | 'diagrams' | 'learning' | 'other' {
  const text = textOf(block);
  if (['DIAGRAM', 'FLOW', 'SEQUENCE', 'ACTIVITY_FLOW', 'STATE_MACHINE'].some((type) => block.blockType.toUpperCase().includes(type)) || /sequence|activity flow|state machine|diagram/.test(text)) return 'diagrams';
  if (block.blockType === 'API_REFERENCE' || /api|endpoint|service|contract|integration/.test(text)) return 'apis';
  if (/exception|error|failure|reversal|return|retry|repair|investigation/.test(text)) return 'exceptions';
  if (/business rule|validation rule|product rule|limit|eligibility/.test(text)) return 'rules';
  if (/interview|case study|related knowledge|reference|learning/.test(text)) return 'learning';
  return 'other';
}

export function deriveModuleSummary(sections: WorkspaceSection[]) {
  const blocks = sections.flatMap((section) => section.blocks);
  const counts = { sections: sections.length, blocks: blocks.length, lifecycle: sections.filter(isLifecycleSection).length, rules: 0, apis: 0, exceptions: 0, diagrams: 0, learning: 0 };
  blocks.forEach((block) => { const category = classifyWorkspaceBlock(block); if (category !== 'other') counts[category] += 1; });
  return counts;
}

export function moduleWorkspaceTabs(sections: WorkspaceSection[]) {
  const blocks = sections.flatMap((section) => section.blocks);
  const tabs = [
    { id: 'lifecycle', label: 'Lifecycle', visible: sections.some(isLifecycleSection), sections: sections.filter(isLifecycleSection) },
    { id: 'rules', label: 'Business Rules', visible: blocks.some((block) => classifyWorkspaceBlock(block) === 'rules') },
    { id: 'apis', label: 'APIs and Services', visible: blocks.some((block) => classifyWorkspaceBlock(block) === 'apis') },
    { id: 'exceptions', label: 'Exceptions', visible: blocks.some((block) => classifyWorkspaceBlock(block) === 'exceptions') },
    { id: 'diagrams', label: 'Diagrams', visible: blocks.some((block) => classifyWorkspaceBlock(block) === 'diagrams') },
    { id: 'learning', label: 'Learning Assets', visible: blocks.some((block) => classifyWorkspaceBlock(block) === 'learning') },
  ];
  return tabs.filter((tab) => tab.visible);
}

export function workspaceBlockTypeSummary(blocks: WorkspaceBlock[]) {
  const counts = new Map<string, number>();
  blocks.forEach((block) => counts.set(block.blockType, (counts.get(block.blockType) ?? 0) + 1));
  return [...counts.entries()].map(([type, count]) => `${type} (${count})`).join(' · ');
}
