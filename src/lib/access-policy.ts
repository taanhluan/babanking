import type { AccountStatus, AccessSource, MembershipStatus } from '@prisma/client';
export type MembershipWindow = { status: MembershipStatus; accessSource: AccessSource; startsAt: Date; expiresAt: Date };
export function isMembershipActive(accountStatus: AccountStatus, membership: MembershipWindow | null | undefined, now = new Date()) {
  return accountStatus === 'ACTIVE' && membership?.status === 'ACTIVE' && membership.startsAt <= now && membership.expiresAt > now;
}
export const safeCallback = (value: string | null | undefined) => value?.startsWith('/') && !value.startsWith('//') ? value : '/workspace';
