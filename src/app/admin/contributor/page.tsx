import Link from 'next/link';
import { WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { assertJourneyCmsDevelopmentEnvironment } from '@/server/cms/journey-cms-environment';

export default function AdminContributorPage() {
  assertJourneyCmsDevelopmentEnvironment();
  return <>
    <WorkspaceTitle
      eyebrow="Admin · Contributor"
      title="Contributor Management"
      description="Manage Development-only contributor tools without changing the existing Contributor workspace."
    />
    <Link
      href="/admin/contributor/journeys"
      className="inline-flex min-h-11 items-center rounded-xl bg-navy px-4 font-semibold text-white"
    >
      Journey Content
    </Link>
  </>;
}
