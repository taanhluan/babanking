export type EditorNode = {
  id: string;
  type: 'module' | 'section' | 'block';
  title: string;
  moduleIndex: number;
  sectionIndex?: number;
  blockIndex?: number;
  depth?: number;
};

export type BreadcrumbItem = { id?: string; label: string; current?: boolean };

export function buildEditorBreadcrumb(nodes: EditorNode[], selectedId: string, journeyTitle: string): BreadcrumbItem[] {
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  if (!selected) return [{ label: journeyTitle, current: true }];
  const moduleNode = nodes.find((node) => node.type === 'module' && node.moduleIndex === selected.moduleIndex);
  const section = selected.sectionIndex === undefined ? undefined : nodes.find((node) => node.type === 'section' && node.moduleIndex === selected.moduleIndex && node.sectionIndex === selected.sectionIndex);
  const items = [{ label: journeyTitle, id: 'journey' }, ...(moduleNode ? [{ label: moduleNode.title, id: moduleNode.id }] : []), ...(section ? [{ label: section.title, id: section.id }] : []), ...(selected.type === 'block' ? [{ label: selected.title, id: selected.id }] : [])];
  return items.map((item, index) => ({ ...item, current: index === items.length - 1 }));
}

export function getSiblingNode(nodes: EditorNode[], selectedId: string, direction: -1 | 1): EditorNode | undefined {
  const selected = nodes.find((node) => node.id === selectedId);
  if (!selected) return undefined;
  const siblings = nodes.filter((node) => node.type === selected.type && node.moduleIndex === selected.moduleIndex && node.sectionIndex === selected.sectionIndex);
  const index = siblings.findIndex((node) => node.id === selected.id);
  return siblings[index + direction];
}
