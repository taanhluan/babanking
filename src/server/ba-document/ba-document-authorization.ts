import 'server-only';
import type { KnowledgePermission } from '@prisma/client';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { evaluateContentAccessForUser } from '@/server/access-control/knowledge-access-repository';
import { roleAllowsPermission } from '@/server/access-control/role-permissions';

declare const authorizedBaDocument: unique symbol;
export type AuthorizedBaDocument = {
  id: string;
  primaryJourneyContentItemId: string;
  [authorizedBaDocument]: true;
};

export async function requireBaDocumentAccess(contentItemId: string, permission: KnowledgePermission) {
  return authorizeIdentity(
    () => db.contentItem.findUnique({ where: { id: contentItemId, type: 'BA_DOCUMENT' }, select: { id: true, primaryJourneyContentItemId: true } }),
    permission,
  );
}

export async function requireBaDocumentAccessBySlug(slug: string, permission: KnowledgePermission) {
  return authorizeIdentity(
    () => db.contentItem.findUnique({ where: { type_slug: { type: 'BA_DOCUMENT', slug } }, select: { id: true, primaryJourneyContentItemId: true } }),
    permission,
  );
}

export async function requireBaDocumentRevisionAccess(revisionId: string, permission: KnowledgePermission) {
  return authorizeIdentity(async () => {
    const revision = await db.contentRevision.findUnique({
      where: { id: revisionId },
      select: { contentItem: { select: { id: true, type: true, primaryJourneyContentItemId: true } } },
    });
    return revision?.contentItem.type === 'BA_DOCUMENT' ? revision.contentItem : null;
  }, permission);
}

async function authorizeIdentity(
  resolveIdentity: () => Promise<{ id: string; primaryJourneyContentItemId: string | null } | null>,
  permission: KnowledgePermission,
) {
  const user = await requireRole('CONTRIBUTOR');
  if (!roleAllowsPermission(user.role, permission)) notFound();
  const identity = await resolveIdentity();
  if (!identity?.primaryJourneyContentItemId) notFound();
  const decision = await evaluateContentAccessForUser(user.id, identity.primaryJourneyContentItemId, permission);
  if (!decision?.allowed) notFound();
  return { user, document: identity as AuthorizedBaDocument, decision };
}
