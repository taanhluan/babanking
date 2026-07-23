import { createHash, timingSafeEqual } from 'node:crypto';
export const hashActivationToken = (token: string) => createHash('sha256').update(token).digest('hex');
export function tokenHashesMatch(token: string, storedHash: string) {
  const candidate = Buffer.from(hashActivationToken(token)), stored = Buffer.from(storedHash);
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}
export const isActivationTokenValid = (expiresAt: Date, usedAt: Date | null, now = new Date()) => !usedAt && expiresAt > now;
