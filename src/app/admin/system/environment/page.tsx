import { requireRole } from '@/lib/auth';
import { WorkspaceTitle, StatusLabel } from '@/components/workspace/WorkspaceShell';
import { getServerEnvironment } from '@/server/env';
import { getSafeEnvironmentDiagnostic } from '@/server/database/database-environment';

export default async function EnvironmentDiagnosticsPage() {
  await requireRole('ADMIN');
  const diagnostic = getSafeEnvironmentDiagnostic(getServerEnvironment());
  const rows = [
    ['Application environment', diagnostic.applicationEnvironment],
    ['Database environment label', diagnostic.databaseEnvironment],
    ['Database host', diagnostic.host],
    ['Database name', diagnostic.databaseName],
    ['Vercel environment', diagnostic.vercelEnvironment],
    ['Database configured', diagnostic.configured ? 'Yes' : 'No'],
    ['Credentials hidden', diagnostic.credentialsHidden ? 'Yes' : 'No'],
    ['Static fallback', diagnostic.staticFallbackEnabled ? 'Enabled' : 'Disabled'],
  ] as const;

  return (
    <>
      <WorkspaceTitle
        eyebrow="SYSTEM SAFETY"
        title="Environment diagnostics"
        description="Safe environment identity only. Credentials and connection strings are never displayed."
      />
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <span className="font-semibold">Safety status</span>
        <StatusLabel status={diagnostic.safetyStatus} />
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
