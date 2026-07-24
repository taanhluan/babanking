import { grantImpliesPermission, roleAllowsPermission } from './role-permissions';
import { isGrantActive } from './grant-validity';
import type {
  AccessDecision,
  AccessReasonCode,
  ContentAccessContext,
  EvaluatedGrant,
} from './access-types';

function decision(
  allowed: boolean,
  reasonCode: AccessReasonCode,
  evaluatedAt: Date,
  grant?: EvaluatedGrant,
): AccessDecision {
  return {
    allowed,
    reasonCode,
    evaluatedAt,
    matchedSource: grant?.source,
    matchedGrantId: grant?.id,
  };
}

function evaluateEnforced(context: ContentAccessContext, now: Date): AccessDecision {
  const { user, content, permission } = context;
  if (!user) return decision(false, 'UNAUTHENTICATED', now);
  if (!user.isActive || user.accountStatus !== 'ACTIVE') {
    return decision(false, 'ACCOUNT_INACTIVE', now);
  }
  if (user.role !== 'ADMIN' && !user.membershipActive) {
    return decision(false, 'MEMBERSHIP_INACTIVE', now);
  }
  if (!roleAllowsPermission(user.role, permission)) {
    return decision(false, 'ROLE_ACTION_NOT_ALLOWED', now);
  }
  if (content.isArchived) return decision(false, 'CONTENT_ARCHIVED', now);
  if (permission === 'VIEW' && !content.isPublished) {
    return decision(false, 'CONTENT_NOT_PUBLISHED', now);
  }
  if (user.role === 'ADMIN') {
    return {
      ...decision(true, 'ALLOWED_ADMIN_BYPASS', now),
      matchedSource: 'ADMIN',
    };
  }

  const relevant = context.grants.filter(
    (grant) => grantImpliesPermission(grant.permission, permission),
  );
  const active = relevant.filter((grant) => isGrantActive(grant, now));
  const contentDeny = active.find(
    (grant) => grant.effect === 'DENY'
      && grant.source === 'CONTENT_GRANT'
      && grant.contentItemId === content.id,
  );
  if (contentDeny) return decision(false, 'CONTENT_EXPLICITLY_DENIED', now, contentDeny);

  const scopeDeny = active.find(
    (grant) => grant.effect === 'DENY'
      && grant.source === 'SCOPE_GRANT'
      && grant.scopeId
      && content.scopeIds.includes(grant.scopeId),
  );
  if (scopeDeny) return decision(false, 'SCOPE_EXPLICITLY_DENIED', now, scopeDeny);

  const contentAllow = active.find(
    (grant) => grant.effect === 'ALLOW'
      && grant.source === 'CONTENT_GRANT'
      && grant.contentItemId === content.id,
  );
  if (contentAllow) {
    return decision(true, 'ALLOWED_DIRECT_CONTENT_GRANT', now, contentAllow);
  }
  if (content.accessMode === 'CONTENT_GRANT_ONLY') {
    return decision(false, 'SCOPE_NOT_GRANTED', now);
  }
  if (!content.scopeIds.length) {
    return decision(false, 'CONTENT_SCOPE_NOT_CONFIGURED', now);
  }

  const allowedScopeIds = new Set(
    active
      .filter((grant) => grant.effect === 'ALLOW' && grant.scopeId)
      .map((grant) => grant.scopeId as string),
  );
  const scopeSatisfied = content.accessMode === 'ALL_SCOPES'
    ? content.scopeIds.every((scopeId) => allowedScopeIds.has(scopeId))
    : content.scopeIds.some((scopeId) => allowedScopeIds.has(scopeId));
  if (!scopeSatisfied) {
    const inactiveRelevant = relevant.some((grant) => !isGrantActive(grant, now));
    return decision(false, inactiveRelevant ? 'GRANT_NOT_ACTIVE' : 'SCOPE_NOT_GRANTED', now);
  }

  const direct = active.find(
    (grant) => grant.effect === 'ALLOW'
      && grant.source === 'SCOPE_GRANT'
      && grant.scopeId
      && content.scopeIds.includes(grant.scopeId),
  );
  if (direct) return decision(true, 'ALLOWED_DIRECT_SCOPE_GRANT', now, direct);
  const packageGrant = active.find(
    (grant) => grant.effect === 'ALLOW'
      && grant.source === 'PACKAGE'
      && grant.scopeId
      && content.scopeIds.includes(grant.scopeId),
  );
  if (packageGrant) return decision(true, 'ALLOWED_PACKAGE_GRANT', now, packageGrant);
  return decision(false, 'SCOPE_NOT_GRANTED', now);
}

export function evaluateContentAccess(context: ContentAccessContext): AccessDecision {
  const now = context.now ?? new Date();
  if (context.mode === 'disabled') return decision(true, 'MATRIX_DISABLED', now);
  const enforced = evaluateEnforced(context, now);
  if (context.mode === 'shadow' && !enforced.allowed) {
    return {
      allowed: true,
      reasonCode: 'MATRIX_SHADOW_ALLOWED',
      shadowReasonCode: enforced.reasonCode,
      evaluatedAt: now,
    };
  }
  return enforced;
}

export function safeAccessDecision(decisionValue: AccessDecision) {
  return {
    allowed: decisionValue.allowed,
    reasonCode: decisionValue.reasonCode,
    evaluatedAt: decisionValue.evaluatedAt,
  };
}
