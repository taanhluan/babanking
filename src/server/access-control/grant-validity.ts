export interface TimeBoundGrant {
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  startsAt: Date | null;
  expiresAt: Date | null;
}

export function isGrantActive(grant: TimeBoundGrant, now = new Date()) {
  return grant.status === 'ACTIVE'
    && (!grant.startsAt || grant.startsAt <= now)
    && (!grant.expiresAt || grant.expiresAt > now);
}
