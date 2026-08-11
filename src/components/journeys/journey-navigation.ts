export type JourneySectionLink = { id: string; title: string };

export type JourneyStageLink = {
  id: string;
  title: string;
  sectionCount: number;
  sections: JourneySectionLink[];
};

export type JourneyNavigationConfig = {
  basePath: string;
  preservedQueryParams?: Readonly<Record<string, string>>;
  stageQueryKey?: string;
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
  navigation: JourneyNavigationConfig,
  stageId: string,
  sectionId?: string,
) {
  const path = `/${navigation.basePath.split(/[?#]/, 1)[0].replace(/^\/+/, '')}`;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(navigation.preservedQueryParams ?? {})) {
    if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(key) && typeof value === 'string') query.set(key, value);
  }
  const stageQueryKey = navigation.stageQueryKey && /^[A-Za-z][A-Za-z0-9_-]*$/.test(navigation.stageQueryKey)
    ? navigation.stageQueryKey
    : 'stage';
  query.set(stageQueryKey, stageId);
  return `${path}?${query.toString()}${sectionId ? `#state-${encodeURIComponent(sectionId)}` : ''}`;
}
