import Link from 'next/link';
import { JourneyReaderLayout, SectionNavigator, BackToTop } from '@/components/journeys/JourneyNavigator';
import { JourneyBlockRenderer } from '@/components/journeys/blocks/JourneyBlockRenderer';
import { buildStageHref } from '@/components/journeys/journey-navigation';
import { deriveBaDocumentRtm, type BaDocumentContentV1 } from '@/server/ba-document/ba-document-domain';

const artifactGroups = [
  ['Requirements', 'requirements'], ['Business Rules', 'businessRules'], ['Validations', 'validations'],
  ['Processes', 'processes'], ['Data Elements', 'dataElements'], ['Data Mappings', 'dataMappings'],
  ['Acceptance Criteria', 'acceptanceCriteria'], ['UAT Scenarios', 'uatScenarios'], ['Decisions', 'decisions'],
] as const;

function valueText(value: unknown) {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item : JSON.stringify(item)).join(', ') || '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function ArtifactCatalogue({ content }: { content: BaDocumentContentV1 }) {
  return <section className="mt-10 space-y-8" aria-labelledby="artifact-catalogue"><h2 id="artifact-catalogue" className="text-2xl font-semibold text-navy">Artifact catalogue</h2>{artifactGroups.map(([label, key]) => {
    const rows = content.artifacts[key] ?? [];
    if (!rows.length) return null;
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].slice(0, 8);
    return <section key={key}><h3 className="text-xl font-semibold text-navy">{label}</h3><div className="mt-3 max-w-full overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50"><tr>{columns.map((column) => <th key={column} className="p-3 font-semibold">{column.replaceAll(/([A-Z])/g, ' $1')}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t align-top">{columns.map((column) => <td key={column} className="max-w-xs break-words p-3">{valueText(row[column as keyof typeof row])}</td>)}</tr>)}</tbody></table></div></section>;
  })}</section>;
}

function Traceability({ content }: { content: BaDocumentContentV1 }) {
  const rows = deriveBaDocumentRtm(content);
  return <section className="mt-10" aria-labelledby="rtm"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 id="rtm" className="text-2xl font-semibold text-navy">Requirements Traceability Matrix</h2><p className="mt-1 text-sm text-textSecondary">Same-document traceability only; cross-document completeness is not represented.</p></div></div><div className="mt-4 max-w-full overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-slate-50"><tr>{['Objective','Requirement','Process','Business Rule','Validation','Data','Acceptance Criteria','UAT Scenario','Link Status'].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.requirementId} className="border-t"><td className="p-3">{content.objectives?.map((item) => item.id).join(', ') || '—'}</td><td className="p-3 font-semibold">{row.requirementId}</td><td className="p-3">{valueText(row.processRefs)}</td><td className="p-3">{valueText(row.businessRuleRefs)}</td><td className="p-3">{valueText(row.validationRefs)}</td><td className="p-3">{valueText(row.dataRefs)}</td><td className="p-3">{valueText(row.acceptanceCriteriaRefs)}</td><td className="p-3">{valueText(row.uatRefs)}</td><td className="p-3 font-semibold">{row.status}</td></tr>)}{!rows.length ? <tr><td colSpan={9} className="p-5 text-textSecondary">No requirements are available for traceability yet.</td></tr> : null}</tbody></table></div></section>;
}

export function BaDocumentReader({ content, slug, activeModuleId }: { content: BaDocumentContentV1; slug: string; activeModuleId?: string }) {
  const modules = [...content.modules].sort((a, b) => a.order - b.order);
  const active = modules.find((module) => module.id === activeModuleId) ?? modules[0];
  const navigation = { basePath: `ba-documents/${slug}`, stageQueryKey: 'module' };
  const links = modules.map((module) => ({ id: module.id, title: module.title, sectionCount: module.sections.length, sections: module.sections.map((section) => ({ id: section.id, title: section.title })) }));
  const index = active ? modules.findIndex((module) => module.id === active.id) : -1;
  return <><JourneyReaderLayout stages={links} selectedStage={active?.id ?? ''} navigation={navigation}>{active ? <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><p className="text-xs font-semibold uppercase tracking-wide text-royalBlue">Module {index + 1} of {modules.length}</p><h2 className="mt-2 text-2xl font-semibold text-navy">{active.title}</h2>{active.summary ? <p className="mt-2 text-textSecondary">{active.summary}</p> : null}<SectionNavigator sections={active.sections.map((section) => ({ id: section.id, title: section.title }))}/><div className="mt-5 space-y-7">{[...active.sections].sort((a,b)=>a.order-b.order).map((section) => <section id={`state-${section.id}`} key={section.id} className="scroll-mt-36 border-t border-slate-200 pt-5"><h3 className="text-xl font-semibold text-navy">{section.title}</h3>{section.summary ? <p className="mt-2 text-textSecondary">{section.summary}</p> : null}<div className="mt-4 space-y-4">{section.blocks.map((block) => <JourneyBlockRenderer key={block.id} block={block as never}/>)}</div></section>)}</div><div className="mt-7 flex justify-between gap-3 border-t pt-5">{modules[index-1] ? <Link className="font-semibold text-royalBlue" href={buildStageHref(navigation, modules[index-1]!.id)}>← Previous: {modules[index-1]!.title}</Link> : <span/>}{modules[index+1] ? <Link className="font-semibold text-royalBlue" href={buildStageHref(navigation, modules[index+1]!.id)}>Next: {modules[index+1]!.title} →</Link> : null}</div></article> : <p>No document modules are available.</p>}<ArtifactCatalogue content={content}/><Traceability content={content}/>{content.references?.journeyKnowledge?.length ? <section className="mt-10"><h2 className="text-2xl font-semibold text-navy">Canonical Journey References</h2><div className="mt-4 grid gap-3">{content.references.journeyKnowledge.map((reference, index) => <Link key={`${reference.journeySlug}-${index}`} href={`/banking-journeys/${reference.journeySlug}`} className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-royalBlue"><span className="block text-xs font-semibold uppercase">Canonical Journey Reference</span><span className="mt-1 block font-semibold">{reference.displayLabel}</span><span className="mt-1 block text-sm">{reference.referenceKind}{reference.referenceId ? ` · ${reference.referenceId}` : ''}</span></Link>)}</div></section> : null}</JourneyReaderLayout><BackToTop/></>;
}
