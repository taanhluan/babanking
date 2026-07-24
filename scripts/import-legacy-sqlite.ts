/* eslint-disable @typescript-eslint/no-explicit-any -- SQLite CLI rows are runtime data validated by the destination Prisma operations. */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  assertDatabaseOperationAllowed,
  parseServerEnvironment,
} from '../src/server/environment-core';
import { loadEnvironmentFiles } from './load-environment-files';

loadEnvironmentFiles();
const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
assertDatabaseOperationAllowed('import-sqlite-development', environment);
const prisma = new PrismaClient();
const source = resolve(process.argv[2] || 'prisma/dev.db');

function rows<T>(table: string): T[] {
  const output = execFileSync('sqlite3', ['-json', source, `SELECT * FROM "${table}"`], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return output.trim() ? JSON.parse(output) : [];
}

const date = (value: number | string | null) => value == null ? null : new Date(Number(value));
const bool = (value: number | boolean) => Boolean(value);

async function main() {
  const userId = new Map<string, string>();
  const planId = new Map<string, string>();

  for (const sourceUser of rows<any>('User')) {
    const user = await prisma.user.upsert({
      where: { email: sourceUser.email },
      update: {
        name: sourceUser.name,
        passwordHash: sourceUser.passwordHash,
        role: sourceUser.role,
        isActive: bool(sourceUser.isActive),
        accountStatus: sourceUser.accountStatus,
        preferredLocale: sourceUser.preferredLocale,
        lastLoginAt: date(sourceUser.lastLoginAt),
      },
      create: {
        id: sourceUser.id,
        name: sourceUser.name,
        email: sourceUser.email,
        passwordHash: sourceUser.passwordHash,
        role: sourceUser.role,
        isActive: bool(sourceUser.isActive),
        accountStatus: sourceUser.accountStatus,
        preferredLocale: sourceUser.preferredLocale,
        createdAt: date(sourceUser.createdAt)!,
        updatedAt: date(sourceUser.updatedAt)!,
        lastLoginAt: date(sourceUser.lastLoginAt),
      },
    });
    userId.set(sourceUser.id, user.id);
  }

  for (const sourcePlan of rows<any>('MembershipPlan')) {
    const plan = await prisma.membershipPlan.upsert({
      where: { code: sourcePlan.code },
      update: {
        name: sourcePlan.name,
        description: sourcePlan.description,
        price: sourcePlan.price,
        currency: sourcePlan.currency,
        billingPeriod: sourcePlan.billingPeriod,
        durationDays: sourcePlan.durationDays,
        featuresJson: sourcePlan.featuresJson,
        displayOrder: sourcePlan.displayOrder,
        isActive: bool(sourcePlan.isActive),
        isPublic: bool(sourcePlan.isPublic),
      },
      create: {
        id: sourcePlan.id,
        name: sourcePlan.name,
        code: sourcePlan.code,
        description: sourcePlan.description,
        price: sourcePlan.price,
        currency: sourcePlan.currency,
        billingPeriod: sourcePlan.billingPeriod,
        durationDays: sourcePlan.durationDays,
        featuresJson: sourcePlan.featuresJson,
        displayOrder: sourcePlan.displayOrder,
        isActive: bool(sourcePlan.isActive),
        isPublic: bool(sourcePlan.isPublic),
        createdAt: date(sourcePlan.createdAt)!,
        updatedAt: date(sourcePlan.updatedAt)!,
      },
    });
    planId.set(sourcePlan.id, plan.id);
  }

  for (const translation of rows<any>('MembershipPlanTranslation')) {
    const mappedPlanId = planId.get(translation.planId)!;
    await prisma.membershipPlanTranslation.upsert({
      where: { planId_locale: { planId: mappedPlanId, locale: translation.locale } },
      update: {
        name: translation.name,
        description: translation.description,
        featuresJson: translation.featuresJson,
      },
      create: {
        id: translation.id,
        planId: mappedPlanId,
        locale: translation.locale,
        name: translation.name,
        description: translation.description,
        featuresJson: translation.featuresJson,
        createdAt: date(translation.createdAt)!,
        updatedAt: date(translation.updatedAt)!,
      },
    });
  }

  for (const request of rows<any>('AccessRequest')) {
    await prisma.accessRequest.upsert({
      where: { id: request.id },
      update: {},
      create: {
        ...request,
        consentAccepted: bool(request.consentAccepted),
        requestedPlanId: request.requestedPlanId ? planId.get(request.requestedPlanId) : null,
        convertedUserId: request.convertedUserId ? userId.get(request.convertedUserId) : null,
        contactedAt: date(request.contactedAt),
        createdAt: date(request.createdAt)!,
        updatedAt: date(request.updatedAt)!,
      },
    });
  }

  for (const membership of rows<any>('Membership')) {
    await prisma.membership.upsert({
      where: { id: membership.id },
      update: {},
      create: {
        ...membership,
        userId: userId.get(membership.userId)!,
        planId: membership.planId ? planId.get(membership.planId) : null,
        createdById: userId.get(membership.createdById)!,
        startsAt: date(membership.startsAt)!,
        expiresAt: date(membership.expiresAt)!,
        suspendedAt: date(membership.suspendedAt),
        cancelledAt: date(membership.cancelledAt),
        createdAt: date(membership.createdAt)!,
        updatedAt: date(membership.updatedAt)!,
      },
    });
  }

  for (const payment of rows<any>('PaymentRecord')) {
    await prisma.paymentRecord.upsert({
      where: { id: payment.id },
      update: {},
      create: {
        ...payment,
        userId: payment.userId ? userId.get(payment.userId) : null,
        planId: payment.planId ? planId.get(payment.planId) : null,
        verifiedById: payment.verifiedById ? userId.get(payment.verifiedById) : null,
        paidAt: date(payment.paidAt),
        verifiedAt: date(payment.verifiedAt),
        createdAt: date(payment.createdAt)!,
        updatedAt: date(payment.updatedAt)!,
      },
    });
  }

  for (const token of rows<any>('AccountActivationToken')) {
    await prisma.accountActivationToken.upsert({
      where: { id: token.id },
      update: {},
      create: {
        ...token,
        userId: userId.get(token.userId)!,
        expiresAt: date(token.expiresAt)!,
        usedAt: date(token.usedAt),
        createdAt: date(token.createdAt)!,
      },
    });
  }

  for (const renewal of rows<any>('RenewalRequest')) {
    await prisma.renewalRequest.upsert({
      where: { id: renewal.id },
      update: {},
      create: {
        ...renewal,
        userId: userId.get(renewal.userId)!,
        requestedPlanId: renewal.requestedPlanId ? planId.get(renewal.requestedPlanId) : null,
        createdAt: date(renewal.createdAt)!,
        updatedAt: date(renewal.updatedAt)!,
      },
    });
  }

  for (const preference of rows<any>('UserCareerPreference')) {
    await prisma.userCareerPreference.upsert({
      where: { userId: userId.get(preference.userId)! },
      update: {
        currentLevelSlug: preference.currentLevelSlug,
        targetLevelSlug: preference.targetLevelSlug,
      },
      create: {
        ...preference,
        userId: userId.get(preference.userId)!,
        updatedAt: date(preference.updatedAt)!,
      },
    });
  }

  for (const audit of rows<any>('AuditLog')) {
    await prisma.auditLog.upsert({
      where: { id: audit.id },
      update: {},
      create: {
        ...audit,
        actorId: audit.actorId ? userId.get(audit.actorId) : null,
        createdAt: date(audit.createdAt)!,
      },
    });
  }

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.membershipPlan.count(),
    prisma.membership.count(),
    prisma.paymentRecord.count(),
    prisma.accessRequest.count(),
  ]);
  console.log(`Imported legacy data: ${counts[0]} users, ${counts[1]} plans, ${counts[2]} memberships, ${counts[3]} payments, ${counts[4]} access requests.`);
}

main()
  .finally(() => prisma.$disconnect());
