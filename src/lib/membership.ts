import 'server-only';
import type { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from './auth';
import { isMembershipActive } from './access-policy';
export { isMembershipActive } from './access-policy';

export async function getAccountAccessState(userId?: string) {
  const sessionUser = userId ? null : await getCurrentUser();
  const id = userId ?? sessionUser?.id;
  if (!id) return { kind: 'ANONYMOUS' as const, user: null, membership: null, hasPremiumAccess: false };
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, accountStatus: true, isActive: true,
      memberships: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { plan: { select: { name: true, code: true } } },
      },
    },
  });
  if (!user) return { kind: 'ANONYMOUS' as const, user: null, membership: null, hasPremiumAccess: false };
  const membership = user.memberships[0] ?? null;
  const adminAccess = user.role === 'ADMIN' && user.isActive && user.accountStatus === 'ACTIVE';
  const hasPremiumAccess = adminAccess || (user.isActive && isMembershipActive(user.accountStatus, membership));
  const kind = !user.isActive || user.accountStatus === 'DISABLED' ? 'DISABLED'
    : user.accountStatus === 'SUSPENDED' ? 'SUSPENDED'
    : user.accountStatus === 'INVITED' ? 'INVITED'
    : hasPremiumAccess ? 'ACTIVE'
    : membership?.status === 'EXPIRED' || (membership && membership.expiresAt <= new Date()) ? 'EXPIRED'
    : membership?.status ?? 'UNASSIGNED';
  return { kind, user, membership, hasPremiumAccess };
}

export async function requirePremiumAccess(path = '/workspace') {
  const state = await getAccountAccessState();
  if (!state.user) redirect(`/login?callbackUrl=${encodeURIComponent(path)}&reason=membership_required`);
  if (!state.hasPremiumAccess) redirect('/account/access');
  return state.user;
}

export async function hasActiveMembership(userId: string) {
  return (await getAccountAccessState(userId)).hasPremiumAccess;
}

export function canAccessRole(role: Role, required: Role) {
  const rank: Record<Role, number> = { MEMBER: 0, CONTRIBUTOR: 1, REVIEWER: 2, ADMIN: 3 };
  return rank[role] >= rank[required];
}
