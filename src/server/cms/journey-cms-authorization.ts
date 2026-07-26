import 'server-only';
import type { KnowledgePermission } from '@prisma/client';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { evaluateContentSlugAccessForUser } from '@/server/access-control/knowledge-access-repository';
import { roleAllowsPermission } from '@/server/access-control/role-permissions';
import { requireJourneyCmsRouteAvailability } from './journey-cms-environment';

export async function requireJourneyCmsAccess(
  slug: string,
  permission: KnowledgePermission,
) {
  requireJourneyCmsRouteAvailability();
  const user = await requireRole('CONTRIBUTOR');
  if (!roleAllowsPermission(user.role, permission)) notFound();
  const access = await evaluateContentSlugAccessForUser(
    user.id,
    'BANKING_JOURNEY',
    slug,
    permission,
  );
  if (!access?.decision.allowed) notFound();
  return { user, content: access.content };
}
