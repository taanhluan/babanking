import Link from 'next/link';
import { WorkspaceTitle } from '@/components/workspace/WorkspaceShell';
import { requireJourneyCmsRouteAvailability } from '@/server/cms/journey-cms-environment';

export default function AdminContributorPage() {
  requireJourneyCmsRouteAvailability();
  return <>
    <WorkspaceTitle
      eyebrow="Admin · Contributor"
      title="Contributor Management"
      description="Manage controlled contributor tools without changing the existing Contributor workspace."
    />
    <div className="flex flex-wrap gap-3"><Link href="/admin/contributor/journeys" className="inline-flex min-h-11 items-center rounded-xl bg-navy px-4 font-semibold text-white">Journey Content</Link><Link href="/admin/customer-segments" className="inline-flex min-h-11 items-center rounded-xl bg-royalBlue px-4 font-semibold text-white">Customer Segments</Link><Link href="/admin/contributor/ba-documents" className="inline-flex min-h-11 items-center rounded-xl bg-royalBlue px-4 font-semibold text-white">BA Documents</Link></div>
  </>;
}
