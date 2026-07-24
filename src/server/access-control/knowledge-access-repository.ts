import 'server-only';
import type { ContentType, KnowledgePermission } from '@prisma/client';
import { db } from '@/lib/db';
import { isMembershipActive } from '@/lib/access-policy';
import { getServerEnvironment } from '@/server/env';
import { evaluateContentAccess } from './knowledge-access-evaluator';
import type {
  AccessDecision,
  ContentAccessContext,
  EvaluatedGrant,
} from './access-types';

const identitySelect = {
  id: true,
  type: true,
  slug: true,
  isArchived: true,
  publishedRevisionId: true,
  accessMode: true,
  knowledgeScopes: {
    select: {
      knowledgeScopeId: true,
      knowledgeScope: { select: { isActive: true, code: true } },
    },
  },
} as const;

export async function getAccessPrincipal(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isActive: true,
      accountStatus: true,
      memberships: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          status: true,
          accessSource: true,
          startsAt: true,
          expiresAt: true,
        },
      },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    role: user.role,
    isActive: user.isActive,
    accountStatus: user.accountStatus,
    membershipActive: user.role === 'ADMIN'
      || isMembershipActive(user.accountStatus, user.memberships[0] ?? null),
  };
}

export async function getUserKnowledgeGrants(userId: string): Promise<EvaluatedGrant[]> {
  const [scopeGrants, contentGrants, assignments] = await Promise.all([
    db.userScopeGrant.findMany({
      where: { userId },
      select: {
        id: true,
        knowledgeScopeId: true,
        permission: true,
        effect: true,
        status: true,
        startsAt: true,
        expiresAt: true,
      },
    }),
    db.userContentGrant.findMany({
      where: { userId },
      select: {
        id: true,
        contentItemId: true,
        permission: true,
        effect: true,
        status: true,
        startsAt: true,
        expiresAt: true,
      },
    }),
    db.userKnowledgePackageAssignment.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        startsAt: true,
        expiresAt: true,
        package: {
          select: {
            isActive: true,
            permissions: {
              select: { id: true, knowledgeScopeId: true, permission: true },
            },
          },
        },
      },
    }),
  ]);
  return [
    ...scopeGrants.map((grant) => ({
      id: grant.id,
      permission: grant.permission,
      effect: grant.effect,
      status: grant.status,
      startsAt: grant.startsAt,
      expiresAt: grant.expiresAt,
      scopeId: grant.knowledgeScopeId,
      source: 'SCOPE_GRANT' as const,
    })),
    ...contentGrants.map((grant) => ({
      id: grant.id,
      permission: grant.permission,
      effect: grant.effect,
      status: grant.status,
      startsAt: grant.startsAt,
      expiresAt: grant.expiresAt,
      contentItemId: grant.contentItemId,
      source: 'CONTENT_GRANT' as const,
    })),
    ...assignments.flatMap((assignment) => assignment.package.isActive
      ? assignment.package.permissions.map((permission) => ({
        id: `${assignment.id}:${permission.id}`,
        permission: permission.permission,
        effect: 'ALLOW' as const,
        status: assignment.status,
        startsAt: assignment.startsAt,
        expiresAt: assignment.expiresAt,
        scopeId: permission.knowledgeScopeId,
        source: 'PACKAGE' as const,
      }))
      : []),
  ];
}

export async function getMinimalContentIdentityBySlug(type: ContentType, slug: string) {
  return db.contentItem.findUnique({
    where: { type_slug: { type, slug } },
    select: identitySelect,
  });
}

export async function getMinimalContentIdentity(contentItemId: string) {
  return db.contentItem.findUnique({
    where: { id: contentItemId },
    select: identitySelect,
  });
}

function contextFor(
  user: Awaited<ReturnType<typeof getAccessPrincipal>>,
  content: NonNullable<Awaited<ReturnType<typeof getMinimalContentIdentity>>>,
  permission: KnowledgePermission,
  grants: EvaluatedGrant[],
): ContentAccessContext {
  return {
    user,
    content: {
      id: content.id,
      isArchived: content.isArchived,
      isPublished: Boolean(content.publishedRevisionId),
      accessMode: content.accessMode,
      scopeIds: content.knowledgeScopes
        .filter((mapping) => mapping.knowledgeScope.isActive)
        .map((mapping) => mapping.knowledgeScopeId),
    },
    permission,
    grants,
    mode: getServerEnvironment().KNOWLEDGE_ACCESS_MATRIX_MODE,
  };
}

export async function evaluateContentAccessForUser(
  userId: string,
  contentItemId: string,
  permission: KnowledgePermission = 'VIEW',
): Promise<AccessDecision | null> {
  const [user, content, grants] = await Promise.all([
    getAccessPrincipal(userId),
    getMinimalContentIdentity(contentItemId),
    getUserKnowledgeGrants(userId),
  ]);
  return content ? evaluateContentAccess(contextFor(user, content, permission, grants)) : null;
}

export async function evaluateScopeAccessForUser(
  userId: string,
  scopeId: string,
  permission: KnowledgePermission,
) {
  const [user, grants] = await Promise.all([
    getAccessPrincipal(userId),
    getUserKnowledgeGrants(userId),
  ]);
  return evaluateContentAccess({
    user,
    content: {
      id: `scope:${scopeId}`,
      isArchived: false,
      isPublished: true,
      accessMode: 'ANY_SCOPE',
      scopeIds: [scopeId],
    },
    permission,
    grants,
    mode: getServerEnvironment().KNOWLEDGE_ACCESS_MATRIX_MODE,
  });
}

export async function evaluateContentSlugAccessForUser(
  userId: string,
  type: ContentType,
  slug: string,
  permission: KnowledgePermission = 'VIEW',
) {
  const [user, content, grants] = await Promise.all([
    getAccessPrincipal(userId),
    getMinimalContentIdentityBySlug(type, slug),
    getUserKnowledgeGrants(userId),
  ]);
  return content
    ? { content, decision: evaluateContentAccess(contextFor(user, content, permission, grants)) }
    : null;
}

export async function getAccessibleContentIds(
  userId: string,
  options: { type?: ContentType; permission?: KnowledgePermission } = {},
) {
  const [user, grants, items] = await Promise.all([
    getAccessPrincipal(userId),
    getUserKnowledgeGrants(userId),
    db.contentItem.findMany({
      where: {
        type: options.type,
        isArchived: false,
        publishedRevisionId: { not: null },
      },
      select: identitySelect,
    }),
  ]);
  const permission = options.permission ?? 'VIEW';
  return items
    .filter((content) => evaluateContentAccess(
      contextFor(user, content, permission, grants),
    ).allowed)
    .map((content) => content.id);
}

export async function getAccessibleContentSlugs(
  userId: string,
  options: { type?: ContentType; permission?: KnowledgePermission } = {},
) {
  const ids = await getAccessibleContentIds(userId, options);
  return db.contentItem.findMany({
    where: { id: { in: ids } },
    select: { id: true, type: true, slug: true },
  });
}

export async function getAccessibleScopeCodes(
  userId: string,
  permission: KnowledgePermission = 'VIEW',
) {
  const principal = await getAccessPrincipal(userId);
  if (principal?.role === 'ADMIN') {
    return db.knowledgeScope.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: { code: true },
    }).then((scopes) => scopes.map((scope) => scope.code));
  }
  const now = new Date();
  const grants = await getUserKnowledgeGrants(userId);
  const scopeIds = grants.filter((grant) =>
    grant.effect === 'ALLOW'
    && grant.scopeId
    && grant.status === 'ACTIVE'
    && (!grant.startsAt || grant.startsAt <= now)
    && (!grant.expiresAt || grant.expiresAt > now)
    && (grant.permission === permission || grant.permission === 'MANAGE'
      || (permission === 'VIEW' && ['EDIT', 'REVIEW', 'PUBLISH'].includes(grant.permission))))
    .map((grant) => grant.scopeId as string);
  const deniedIds = new Set(grants.filter((grant) =>
    grant.effect === 'DENY' && grant.scopeId && grant.status === 'ACTIVE')
    .map((grant) => grant.scopeId as string));
  return db.knowledgeScope.findMany({
    where: { id: { in: scopeIds.filter((id) => !deniedIds.has(id)) }, isActive: true },
    orderBy: { displayOrder: 'asc' },
    select: { code: true },
  }).then((scopes) => scopes.map((scope) => scope.code));
}

export async function getAuthorizedSearchFilter(userId: string) {
  return { id: { in: await getAccessibleContentIds(userId) } };
}
