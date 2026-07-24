import 'server-only';
import type { ContentType, KnowledgePermission } from '@prisma/client';
import { notFound } from 'next/navigation';
import { requirePremiumAccess } from '@/lib/membership';
import {
  evaluateContentAccessForUser,
  evaluateContentSlugAccessForUser,
  evaluateScopeAccessForUser,
} from './knowledge-access-repository';

export async function requireContentAccess(
  contentItemId: string,
  permission: KnowledgePermission = 'VIEW',
) {
  const user = await requirePremiumAccess();
  const decision = await evaluateContentAccessForUser(user.id, contentItemId, permission);
  if (!decision?.allowed) notFound();
  return { user, decision };
}

export async function assertScopeActionAccess(
  userId: string,
  scopeId: string,
  permission: KnowledgePermission,
) {
  const decision = await evaluateScopeAccessForUser(userId, scopeId, permission);
  if (!decision.allowed) throw new Error('This knowledge scope is not available.');
  return decision;
}

export async function requireContentSlugAccess(
  type: ContentType,
  slug: string,
  permission: KnowledgePermission = 'VIEW',
) {
  const user = await requirePremiumAccess();
  const result = await evaluateContentSlugAccessForUser(user.id, type, slug, permission);
  if (!result?.decision.allowed) notFound();
  return { user, ...result };
}

export async function assertContentActionAccess(
  userId: string,
  contentItemId: string,
  permission: KnowledgePermission,
) {
  const decision = await evaluateContentAccessForUser(userId, contentItemId, permission);
  if (!decision?.allowed) throw new Error('This knowledge resource is not available.');
  return decision;
}
