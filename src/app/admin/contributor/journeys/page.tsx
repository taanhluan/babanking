import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { StatusLabel, WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { requireJourneyCmsRouteAvailability } from '@/server/cms/journey-cms-environment';
import { JourneyCmsRepository } from '@/server/cms/journey-cms-repository';

function preview(value: string | null) {
  try {
    const parsed = value ? JSON.parse(value) as { title?: unknown; summary?: unknown } : null;
    return {
      title: typeof parsed?.title === 'string' ? parsed.title : 'Untitled Journey',
      summary: typeof parsed?.summary === 'string' ? parsed.summary : '',
    };
  } catch {
    return { title: 'Untitled Journey', summary: '' };
  }
}

export default async function JourneyCmsListPage() {
  requireJourneyCmsRouteAvailability();
  const user = await requireRole('ADMIN');
  const journeys = await JourneyCmsRepository.listAuthorized(user.id);
  return <>
    <WorkspaceTitle
      eyebrow="Admin · Contributor · Journey Content"
      title="Journey CMS"
      description="Controlled Journey editing with versioned drafts, independent review, publication history and rollback."
    />
    <div className="space-y-3">
      {journeys.map((journey) => {
        const metadata = preview(journey.previewJson);
        const latest = journey.revisions[0];
        return <article key={journey.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs text-slate-500">{journey.slug}</p>
              <h2 className="mt-1 text-lg font-semibold">{metadata.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{metadata.summary}</p>
              <p className="mt-2 text-xs text-slate-500">
                Latest revision: {latest
                  ? `v${latest.version} · ${latest.status} · schema ${latest.schemaVersion}`
                  : 'none'}
              </p>
              {latest ? <p className="mt-1 text-xs text-slate-500">
                Author: {latest.author?.name ?? 'Migration'} · Reviewer: {latest.reviewer?.name ?? '—'}
                {' · '}Created {latest.createdAt.toLocaleDateString()}
                {' · '}Updated {latest.updatedAt.toLocaleDateString()}
                {latest.publishedAt ? ` · Published ${latest.publishedAt.toLocaleDateString()}` : ''}
              </p> : null}
            </div>
            <div className="flex items-center gap-3">
              <StatusLabel status={journey.isArchived ? 'ARCHIVED' : journey.publishedRevisionId ? 'PUBLISHED' : 'DRAFT'} />
              <Link href={`/admin/contributor/journeys/${journey.slug}`} className="font-semibold text-royalBlue">
                Open editor
              </Link>
            </div>
          </div>
        </article>;
      })}
    </div>
  </>;
}
