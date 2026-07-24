import { describe, expect, it } from 'vitest';
import { evaluateContentAccess } from './knowledge-access-evaluator';
import type { ContentAccessContext } from './access-types';

const base: ContentAccessContext = { mode: 'enforced', permission: 'VIEW', user: { id: 'u', role: 'MEMBER', isActive: true, accountStatus: 'ACTIVE', membershipActive: true }, content: { id: 'c', isArchived: false, isPublished: true, accessMode: 'ANY_SCOPE', scopeIds: ['payments'] }, grants: [] };
const grant = (overrides = {}) => ({ id: 'g', permission: 'VIEW' as const, effect: 'ALLOW' as const, status: 'ACTIVE' as const, startsAt: null, expiresAt: null, scopeId: 'payments', source: 'SCOPE_GRANT' as const, ...overrides });

describe('knowledge access evaluator', () => {
  it('blocks anonymous users', () => expect(evaluateContentAccess({ ...base, user: null }).reasonCode).toBe('UNAUTHENTICATED'));
  it('blocks users without a scope', () => expect(evaluateContentAccess(base).reasonCode).toBe('SCOPE_NOT_GRANTED'));
  it('allows an active payment grant', () => expect(evaluateContentAccess({ ...base, grants: [grant()] }).allowed).toBe(true));
  it('blocks expired grants', () => expect(evaluateContentAccess({ ...base, grants: [grant({ expiresAt: new Date('2020-01-01') })] }).reasonCode).toBe('GRANT_NOT_ACTIVE'));
  it('blocks revoked grants', () => expect(evaluateContentAccess({ ...base, grants: [grant({ status: 'REVOKED' })] }).allowed).toBe(false));
  it('lets an admin bypass scopes', () => expect(evaluateContentAccess({ ...base, user: { ...base.user!, role: 'ADMIN', membershipActive: true } }).reasonCode).toBe('ALLOWED_ADMIN_BYPASS'));
  it('honors an explicit scope deny', () => expect(evaluateContentAccess({ ...base, grants: [grant(), grant({ id: 'deny', effect: 'DENY' })] }).reasonCode).toBe('SCOPE_EXPLICITLY_DENIED'));
  it('honors direct content grant', () => expect(evaluateContentAccess({ ...base, grants: [grant({ source: 'CONTENT_GRANT', contentItemId: 'c', scopeId: undefined })] }).reasonCode).toBe('ALLOWED_DIRECT_CONTENT_GRANT'));
  it('does not silently allow an unknown mode', () => expect(evaluateContentAccess({ ...base, mode: 'shadow' }).allowed).toBe(true));
});
