import { requirePremiumAccess } from '@/lib/membership'; import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
export const dynamic = 'force-dynamic'; export const metadata = { robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) { const user = await requirePremiumAccess('/workspace'); return <WorkspaceShell user={user}>{children}</WorkspaceShell>; }
