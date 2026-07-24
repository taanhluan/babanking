import type { KnowledgePermission, Role } from '@prisma/client';

const rolePermissions: Record<Role, ReadonlySet<KnowledgePermission>> = {
  MEMBER: new Set(['VIEW']),
  CONTRIBUTOR: new Set(['VIEW', 'CREATE', 'EDIT']),
  REVIEWER: new Set(['VIEW', 'REVIEW', 'PUBLISH']),
  ADMIN: new Set(['VIEW', 'CREATE', 'EDIT', 'REVIEW', 'PUBLISH', 'MANAGE']),
};

const implications: Record<KnowledgePermission, ReadonlySet<KnowledgePermission>> = {
  VIEW: new Set(['VIEW']),
  CREATE: new Set(['CREATE']),
  EDIT: new Set(['EDIT', 'VIEW']),
  REVIEW: new Set(['REVIEW', 'VIEW']),
  PUBLISH: new Set(['PUBLISH', 'REVIEW', 'VIEW']),
  MANAGE: new Set(['VIEW', 'CREATE', 'EDIT', 'REVIEW', 'PUBLISH', 'MANAGE']),
};

export function roleAllowsPermission(role: Role, permission: KnowledgePermission) {
  return rolePermissions[role].has(permission);
}

export function grantImpliesPermission(
  granted: KnowledgePermission,
  requested: KnowledgePermission,
) {
  return implications[granted].has(requested);
}

export function getRolePermissions(role: Role) {
  return [...rolePermissions[role]];
}
