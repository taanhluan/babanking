import { requireRole } from '@/lib/auth'; import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { getServerEnvironment } from '@/server/env';
export const dynamic = 'force-dynamic'; export const metadata = { robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('ADMIN');
  const environment = getServerEnvironment();
  return <WorkspaceShell user={user}>
    {environment.APP_ENV === 'development' ? <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900">Development Environment · Connected to development database</div> : null}
    {children}
  </WorkspaceShell>;
}
