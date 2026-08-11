import Link from 'next/link';
import type { ReactNode } from 'react';
import type { CanonicalJourney, CanonicalStage } from './canonical-journey-mapper';
import { JourneyBlockRenderer } from './blocks/JourneyBlockRenderer';
import { buildStageHref, deriveJourneyNavigation, type JourneyNavigationConfig } from './journey-navigation';
import { BackToTop, JourneyReaderLayout, SectionNavigator } from './JourneyNavigator';

export type SharedJourneyReaderProps = {
  journey: CanonicalJourney;
  activeStageId?: string;
  navigation: JourneyNavigationConfig;
  afterStage?: ReactNode;
};

function StageContent({ stage, stages, navigation }: { stage: CanonicalStage; stages: CanonicalStage[]; navigation: JourneyNavigationConfig }) {
  const index = stages.findIndex((item) => item.id === stage.id);
  const adjacent = (offset: number) => stages[index + offset];
  const sections = stage.states.map((state) => ({ id: state.id, title: state.title }));
  return <section id="journey-stage-content" className="min-w-0 max-w-full scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <p className="text-xs font-semibold uppercase tracking-wide text-royalBlue">Stage {index + 1} of {stages.length}</p>
    <h2 className="mt-2 break-words text-2xl font-semibold text-navy sm:text-3xl">{stage.title}</h2>
    {stage.summary ? <p className="mt-3 max-w-3xl text-textSecondary">{stage.summary}</p> : null}
    <SectionNavigator sections={sections} />
    {stage.states.length ? <div className="mt-5 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-5">{stage.states.map((state) => <article key={state.id} id={`state-${state.id}`} style={{ scrollMarginTop: '9rem' }} className="min-w-0 max-w-full overflow-hidden border-t border-slate-200 pt-4"><h3 className="max-w-3xl font-semibold text-navy">{state.title}</h3>{state.summary ? <p className="mt-2 max-w-3xl text-sm leading-6 text-textSecondary">{state.summary}</p> : null}<div className="mt-3 min-w-0 max-w-full space-y-3">{state.blocks.map((block) => <JourneyBlockRenderer key={block.id} block={block} />)}</div></article>)}</div> : <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-textSecondary">No documentation is available for this stage yet.</p>}
    <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-5">{adjacent(-1) ? <Link href={buildStageHref(navigation, adjacent(-1)!.id)} className="min-h-11 font-semibold text-royalBlue">← Previous: {adjacent(-1)!.title}</Link> : <span />}{adjacent(1) ? <Link href={buildStageHref(navigation, adjacent(1)!.id)} className="min-h-11 font-semibold text-royalBlue">Next: {adjacent(1)!.title} →</Link> : null}</div>
  </section>;
}

export function SharedJourneyReader({ journey, activeStageId, navigation, afterStage }: SharedJourneyReaderProps) {
  const activeStage = journey.stages.find((stage) => stage.id === activeStageId) ?? journey.stages[0];
  return <>
    <JourneyReaderLayout stages={deriveJourneyNavigation(journey.stages)} selectedStage={activeStage?.id ?? ''} navigation={navigation}>
      {activeStage ? <StageContent stage={activeStage} stages={journey.stages} navigation={navigation} /> : <p className="rounded-xl border border-dashed p-5 text-textSecondary">No lifecycle stage content is available yet.</p>}
      {afterStage}
    </JourneyReaderLayout>
    <BackToTop />
  </>;
}
