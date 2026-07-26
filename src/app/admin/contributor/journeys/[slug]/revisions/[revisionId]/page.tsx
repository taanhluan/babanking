import { notFound } from 'next/navigation';
import { StatusLabel, WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { requireJourneyCmsAccess } from '@/server/cms/journey-cms-authorization';
import { JourneyCmsRepository } from '@/server/cms/journey-cms-repository';

export default async function JourneyRevisionPage({
  params,
}: {
  params: Promise<{ slug: string; revisionId: string }>;
}) {
  const { slug, revisionId } = await params;
  const { content } = await requireJourneyCmsAccess(slug, 'VIEW');
  const revision = await JourneyCmsRepository.getRevision(content.id, revisionId);
  if (!revision) notFound();
  return <>
    <WorkspaceTitle
      eyebrow="Admin · Contributor · Revision History"
      title={`${slug.replaceAll('-', ' ')} · v${revision.version}`}
      description={`Author: ${revision.author?.name ?? 'Migration'} · Reviewer: ${revision.reviewer?.name ?? '—'}`}
    />
    <StatusLabel status={revision.status} />
    <p className="mt-3 text-sm text-slate-500">
      Stable slug: {slug} · Schema {revision.schemaVersion}
      {' · '}Created {revision.createdAt.toLocaleString()}
      {' · '}Updated {revision.updatedAt.toLocaleString()}
      {revision.publishedAt ? ` · Published ${revision.publishedAt.toLocaleString()}` : ''}
    </p>
    <pre className="mt-5 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-5">
      {JSON.stringify(JSON.parse(revision.contentJson), null, 2)}
    </pre>
  </>;
}
