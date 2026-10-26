import { TeamShell } from '@/components/team/TeamShell';
import { requireBaTeamMember } from '@/server/ba-team/ba-team-access';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const actor = await requireBaTeamMember('/team');
  return <TeamShell user={actor}>{children}</TeamShell>;
}
