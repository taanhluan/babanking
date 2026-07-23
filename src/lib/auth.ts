import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@prisma/client';
import { db } from '@/lib/db';
import { hasRole } from './permissions';
import { safeCallback } from './access-policy';
export { safeCallback } from './access-policy';
const COOKIE = 'bba_session';
const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error('AUTH_SECRET must contain at least 32 characters.');
  return new TextEncoder().encode(value);
};
export async function createSession(userId: string) {
  const token = await new SignJWT({ userId }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('8h').sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 28800 });
}
export async function clearSession() { (await cookies()).delete(COOKIE); }
export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE)?.value; if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.userId !== 'string') return null;
    return await db.user.findFirst({ where: { id: payload.userId, isActive: true, accountStatus: { not: 'DISABLED' } }, select: { id: true, name: true, email: true, role: true, isActive: true, accountStatus: true, preferredLocale: true } });
  } catch { return null; }
}
export async function requireUser(callbackUrl = '/account/membership') { const user = await getCurrentUser(); if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(safeCallback(callbackUrl))}`); return user; }
export async function requireRole(role: Role) {
  const user = await requireUser();
  if (!hasRole(user.role, role)) redirect('/workspace');
  if (user.role !== 'ADMIN') {
    const now = new Date();
    const entitlement = await db.membership.findFirst({ where: { userId: user.id, status: 'ACTIVE', startsAt: { lte: now }, expiresAt: { gt: now } }, select: { id: true } });
    if (user.accountStatus !== 'ACTIVE' || !entitlement) redirect('/account/access');
  }
  return user;
}
