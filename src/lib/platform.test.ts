import { describe, expect, it } from 'vitest';
import { canEditRevision, canReviewRevision, hasRole } from './permissions';
import { canTransition } from './workflow';
import { contentDraftSchema, normalizeSlug, reservedSlugs } from './validation';
import { isMembershipActive, safeCallback } from './access-policy';
import { hashActivationToken, isActivationTokenValid, tokenHashesMatch } from './activation-core';
import { canTransitionAccessRequest, canTransitionMembership, canTransitionPayment } from './membership-workflow';
import {getAlternateLocale,isSupportedLocale} from '../i18n/config';
import {getLocaleFromPath,getLocalizedPath,replacePathLocale} from '../i18n/routing';
import {formatCurrency,formatDate} from '../i18n/format';

describe('slug governance', () => {
  it('normalizes titles and protects platform routes', () => {
    expect(normalizeSlug(' Payment Limits & Rules ')).toBe('payment-limits-and-rules');
    expect(reservedSlugs.has('admin')).toBe(true);
  });
});
describe('locale routing and formatting',()=>{
  it('validates only technical locale codes and preserves paths',()=>{
    expect(isSupportedLocale('en')).toBe(true);expect(isSupportedLocale('vi')).toBe(true);expect(isSupportedLocale('vni')).toBe(false);
    expect(getLocaleFromPath('/vi/search')).toBe('vi');expect(getLocalizedPath('/search?q=kyc','vi')).toBe('/vi/search?q=kyc');
    expect(replacePathLocale('/en/banking-journeys/customer-onboarding','vi')).toBe('/vi/banking-journeys/customer-onboarding');
    expect(getAlternateLocale('en')).toBe('vi');
  });
  it('formats dates and money for English and Vietnamese',()=>{
    const date=new Date('2026-07-23T00:00:00Z');
    expect(formatDate(date,'en')).toContain('2026');expect(formatDate(date,'vi')).toContain('2026');
    expect(formatCurrency(100000000,'VND','vi')).toMatch(/1[.\\s]000[.\\s]000|1\\.000\\.000/);
  });
});
describe('permissions', () => {
  it('enforces hierarchy, ownership and independent review', () => {
    expect(hasRole('ADMIN', 'REVIEWER')).toBe(true);
    expect(canEditRevision('CONTRIBUTOR', 'u1', 'u1', 'DRAFT')).toBe(true);
    expect(canEditRevision('CONTRIBUTOR', 'u1', 'u2', 'DRAFT')).toBe(false);
    expect(canReviewRevision('REVIEWER', 'u1', 'u1')).toBe(false);
    expect(canReviewRevision('REVIEWER', 'u1', 'u2')).toBe(true);
  });
});
describe('workflow', () => {
  it('permits only defined transitions', () => {
    expect(canTransition('DRAFT', 'SUBMIT')).toBe(true);
    expect(canTransition('IN_REVIEW', 'PUBLISH')).toBe(true);
    expect(canTransition('PUBLISHED', 'SUBMIT')).toBe(false);
  });
});
describe('content validation', () => {
  it('rejects invalid structured content', () => {
    expect(contentDraftSchema.safeParse({ type: 'BA_PRACTICE', title: 'Short', slug: 'valid-slug', summary: 'Too short', contentJson: 'not json' }).success).toBe(false);
  });
});
describe('paid access policy', () => {
  const now = new Date('2026-07-23T00:00:00Z');
  it('requires an active account and a current active entitlement', () => {
    expect(isMembershipActive('ACTIVE', { status: 'ACTIVE', accessSource: 'PAID', startsAt: new Date('2026-07-01'), expiresAt: new Date('2026-08-01') }, now)).toBe(true);
    expect(isMembershipActive('ACTIVE', { status: 'ACTIVE', accessSource: 'COMPLIMENTARY', startsAt: new Date('2026-07-01'), expiresAt: now }, now)).toBe(false);
    expect(isMembershipActive('SUSPENDED', { status: 'ACTIVE', accessSource: 'INTERNAL', startsAt: new Date('2026-07-01'), expiresAt: new Date('2026-08-01') }, now)).toBe(false);
  });
  it('allows only defined business transitions', () => {
    expect(canTransitionAccessRequest('PAYMENT_PENDING', 'PAYMENT_CONFIRMED')).toBe(true);
    expect(canTransitionPayment('PAID', 'PAID')).toBe(false);
    expect(canTransitionMembership('SUSPENDED', 'ACTIVE')).toBe(true);
    expect(canTransitionMembership('PENDING', 'ACTIVE')).toBe(true);
  });
});
describe('activation and redirects', () => {
  it('hashes tokens, compares them safely, and enforces expiry/single use', () => {
    const token = 'a'.repeat(43), digest = hashActivationToken(token);
    expect(digest).not.toContain(token);
    expect(tokenHashesMatch(token, digest)).toBe(true);
    expect(isActivationTokenValid(new Date(Date.now() + 1000), null)).toBe(true);
    expect(isActivationTokenValid(new Date(Date.now() - 1000), null)).toBe(false);
    expect(isActivationTokenValid(new Date(Date.now() + 1000), new Date())).toBe(false);
  });
  it('rejects external callback URLs', () => {
    expect(safeCallback('/search?q=rules')).toBe('/search?q=rules');
    expect(safeCallback('//evil.example')).toBe('/workspace');
    expect(safeCallback('https://evil.example')).toBe('/workspace');
  });
});
