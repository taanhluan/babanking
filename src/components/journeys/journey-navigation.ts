export type JourneySectionLink = { id: string; title: string };

export type JourneyStageLink = {
  id: string;
  title: string;
  sectionCount: number;
  sections: JourneySectionLink[];
};

export function deriveJourneyNavigation(
  stages: Array<{
    id: string;
    title: string;
    states: Array<{ id: string; title: string }>;
  }>,
): JourneyStageLink[] {
  return stages.map((stage) => ({
    id: stage.id,
    title: stage.title,
    sectionCount: stage.states.length,
    sections: stage.states.map((state) => ({ id: state.id, title: state.title })),
  }));
}

export function buildStageHref(
  slug: string,
  paymentType: string,
  stageId: string,
  sectionId?: string,
) {
  const query = new URLSearchParams({ paymentType, stage: stageId });
  return `/${slug}?${query.toString()}${sectionId ? `#state-${sectionId}` : ''}`;
}
