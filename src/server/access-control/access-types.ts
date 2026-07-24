import type {
  ContentAccessMode,
  GrantEffect,
  KnowledgePermission,
  Role,
} from '@prisma/client';

export type MatrixMode = 'disabled' | 'shadow' | 'enforced';

export type AccessReasonCode =
  | 'ALLOWED_ADMIN_BYPASS'
  | 'ALLOWED_DIRECT_CONTENT_GRANT'
  | 'ALLOWED_DIRECT_SCOPE_GRANT'
  | 'ALLOWED_PACKAGE_GRANT'
  | 'MATRIX_DISABLED'
  | 'MATRIX_SHADOW_ALLOWED'
  | 'UNAUTHENTICATED'
  | 'ACCOUNT_INACTIVE'
  | 'MEMBERSHIP_INACTIVE'
  | 'ROLE_ACTION_NOT_ALLOWED'
  | 'CONTENT_NOT_PUBLISHED'
  | 'CONTENT_ARCHIVED'
  | 'CONTENT_EXPLICITLY_DENIED'
  | 'SCOPE_EXPLICITLY_DENIED'
  | 'GRANT_NOT_ACTIVE'
  | 'SCOPE_NOT_GRANTED'
  | 'CONTENT_SCOPE_NOT_CONFIGURED';

export interface EvaluatedGrant {
  id: string;
  permission: KnowledgePermission;
  effect: GrantEffect;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  startsAt: Date | null;
  expiresAt: Date | null;
  scopeId?: string;
  contentItemId?: string;
  source: 'CONTENT_GRANT' | 'SCOPE_GRANT' | 'PACKAGE';
}

export interface ContentAccessContext {
  user: {
    id: string;
    role: Role;
    isActive: boolean;
    accountStatus: string;
    membershipActive: boolean;
  } | null;
  content: {
    id: string;
    isArchived: boolean;
    isPublished: boolean;
    accessMode: ContentAccessMode;
    scopeIds: string[];
  };
  permission: KnowledgePermission;
  grants: EvaluatedGrant[];
  mode: MatrixMode;
  now?: Date;
}

export interface AccessDecision {
  allowed: boolean;
  reasonCode: AccessReasonCode;
  matchedSource?: 'ADMIN' | 'CONTENT_GRANT' | 'SCOPE_GRANT' | 'PACKAGE';
  matchedGrantId?: string;
  evaluatedAt: Date;
  shadowReasonCode?: AccessReasonCode;
}
