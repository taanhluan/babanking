import { hash } from 'bcryptjs';
import {
  ContentType,
  KnowledgePermission,
  PrismaClient,
  Role,
} from '@prisma/client';
import {
  assertDatabaseEnvironmentSafe,
  parseServerEnvironment,
} from '../src/server/environment-core';
import { loadEnvironmentFiles } from './load-environment-files';

loadEnvironmentFiles();
const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
assertDatabaseEnvironmentSafe(environment);
if (!['development', 'preview'].includes(environment.APP_ENV)) {
  throw new Error('Knowledge access seed is allowed only in development or preview.');
}

const prisma = new PrismaClient();
const now = new Date();
const oneYear = new Date(now);
oneYear.setFullYear(oneYear.getFullYear() + 1);

const scopes = [
  ['CUSTOMER_ONBOARDING', 'BANKING_DOMAIN', 'Customer Onboarding', 'Tiếp nhận khách hàng'],
  ['PAYMENTS', 'BANKING_DOMAIN', 'Payments', 'Thanh toán'],
  ['CARDS', 'BANKING_DOMAIN', 'Cards', 'Thẻ'],
  ['DEPOSITS', 'BANKING_DOMAIN', 'Deposits', 'Tiền gửi'],
  ['LENDING', 'BANKING_DOMAIN', 'Lending', 'Cho vay'],
  ['WEALTH_INVESTMENT', 'BANKING_DOMAIN', 'Wealth and Investment', 'Quản lý tài sản và đầu tư'],
  ['CUSTOMER_SERVICE', 'BANKING_DOMAIN', 'Customer Service', 'Dịch vụ khách hàng'],
  ['SECURITY_ACCESS', 'BANKING_DOMAIN', 'Security and Access', 'Bảo mật và truy cập'],
  ['NOTIFICATION_ENGAGEMENT', 'BANKING_DOMAIN', 'Notification and Engagement', 'Thông báo và tương tác'],
  ['PERSONAL_FINANCE_MANAGEMENT', 'BANKING_DOMAIN', 'Personal Finance Management', 'Quản lý tài chính cá nhân'],
  ['BA_PRACTICE', 'BA_PRACTICE', 'BA Practice', 'Thực hành BA'],
  ['CAREER_ROADMAP', 'CAREER', 'Career Roadmap', 'Lộ trình nghề nghiệp'],
] as const;

const journeyScopes: Record<string, string> = {
  'customer-onboarding': 'CUSTOMER_ONBOARDING',
  'payments-and-transfers': 'PAYMENTS',
  cards: 'CARDS',
  deposits: 'DEPOSITS',
  lending: 'LENDING',
  'wealth-and-investment': 'WEALTH_INVESTMENT',
  'customer-service': 'CUSTOMER_SERVICE',
  'security-and-access': 'SECURITY_ACCESS',
  'notification-and-engagement': 'NOTIFICATION_ENGAGEMENT',
  'personal-finance-management': 'PERSONAL_FINANCE_MANAGEMENT',
};

const caseScopes: Record<string, string> = {
  'understanding-payment-journey': 'PAYMENTS',
  'payment-limits-business-rules': 'PAYMENTS',
  'digital-onboarding-journey': 'CUSTOMER_ONBOARDING',
  'conducting-fit-gap-analysis': 'BA_PRACTICE',
  'requirement-notes-to-brd': 'BA_PRACTICE',
};

async function upsertScopeGrant(
  userId: string,
  scopeId: string,
  permission: KnowledgePermission,
  grantedById: string,
  reason: string,
) {
  const existing = await prisma.userScopeGrant.findFirst({
    where: {
      userId,
      knowledgeScopeId: scopeId,
      permission,
      effect: 'ALLOW',
      status: 'ACTIVE',
    },
  });
  if (existing) return existing;
  return prisma.userScopeGrant.create({
    data: {
      userId,
      knowledgeScopeId: scopeId,
      permission,
      grantedById,
      reason,
    },
  });
}

async function ensureTestUser(
  email: string,
  name: string,
  role: Role,
  passwordHash: string,
  adminId: string,
) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, isActive: true, accountStatus: 'ACTIVE' },
    create: { email, name, role, passwordHash, isActive: true, accountStatus: 'ACTIVE' },
  });
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, status: 'ACTIVE', startsAt: { lte: now }, expiresAt: { gt: now } },
  });
  if (!membership) {
    await prisma.membership.create({
      data: {
        userId: user.id,
        status: 'ACTIVE',
        accessSource: 'INTERNAL',
        startsAt: now,
        expiresAt: oneYear,
        createdById: adminId,
      },
    });
  }
  return user;
}

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true },
  });
  if (!admin) throw new Error('An active Admin is required for knowledge access setup.');

  const scopeByCode = new Map<string, string>();
  for (const [code, type, nameEn, nameVi] of scopes) {
    const scope = await prisma.knowledgeScope.upsert({
      where: { code },
      update: { type, nameEn, nameVi, isActive: true },
      create: {
        code,
        type,
        nameEn,
        nameVi,
        descriptionEn: `${nameEn} knowledge scope.`,
        descriptionVi: `Phạm vi kiến thức ${nameVi.toLocaleLowerCase('vi')}.`,
        displayOrder: scopeByCode.size + 1,
      },
    });
    scopeByCode.set(code, scope.id);
  }

  const packageDefinitions = [
    {
      code: 'PAYMENT_KNOWLEDGE_PACK',
      nameEn: 'Payment Knowledge Pack',
      nameVi: 'Gói kiến thức thanh toán',
      scopeCodes: ['PAYMENTS'],
    },
    {
      code: 'BANKING_BA_FOUNDATION',
      nameEn: 'Banking BA Foundation',
      nameVi: 'Nền tảng BA ngân hàng',
      scopeCodes: ['BA_PRACTICE', 'CAREER_ROADMAP', 'CUSTOMER_ONBOARDING', 'PAYMENTS'],
    },
    {
      code: 'FULL_KNOWLEDGE_ACCESS',
      nameEn: 'Full Knowledge Access',
      nameVi: 'Toàn quyền truy cập kiến thức',
      scopeCodes: scopes.map(([code]) => code),
    },
  ];
  for (const definition of packageDefinitions) {
    const knowledgePackage = await prisma.knowledgePackage.upsert({
      where: { code: definition.code },
      update: { nameEn: definition.nameEn, nameVi: definition.nameVi, isActive: true },
      create: {
        code: definition.code,
        nameEn: definition.nameEn,
        nameVi: definition.nameVi,
        descriptionEn: `${definition.nameEn} permission template.`,
        descriptionVi: `Mẫu phân quyền ${definition.nameVi.toLocaleLowerCase('vi')}.`,
        displayOrder: packageDefinitions.indexOf(definition) + 1,
      },
    });
    for (const scopeCode of definition.scopeCodes) {
      await prisma.knowledgePackagePermission.upsert({
        where: {
          packageId_knowledgeScopeId_permission: {
            packageId: knowledgePackage.id,
            knowledgeScopeId: scopeByCode.get(scopeCode)!,
            permission: 'VIEW',
          },
        },
        update: {},
        create: {
          packageId: knowledgePackage.id,
          knowledgeScopeId: scopeByCode.get(scopeCode)!,
          permission: 'VIEW',
        },
      });
    }
  }

  const contentItems = await prisma.contentItem.findMany({
    select: { id: true, type: true, slug: true, publishedRevision: { select: { contentJson: true } } },
  });
  for (const item of contentItems) {
    try {
      const source = item.publishedRevision ? JSON.parse(item.publishedRevision.contentJson) as Record<string, unknown> : null;
      const preview = source && typeof source.title === 'string' && typeof source.summary === 'string'
        ? { title: source.title, summary: source.summary, difficulty: source.level ?? null, estimatedReadingTime: source.readingTime ?? null, category: source.category ?? source.domain ?? null }
        : null;
      if (preview) await prisma.contentItem.update({ where: { id: item.id }, data: { previewJson: JSON.stringify(preview) } });
    } catch { /* Invalid draft JSON is not publishable preview data. */ }
    const scopeCode = item.type === ContentType.BANKING_JOURNEY
      ? journeyScopes[item.slug]
      : item.type === ContentType.BA_PRACTICE
        ? 'BA_PRACTICE'
        : item.type === ContentType.CAREER_LEVEL
          ? 'CAREER_ROADMAP'
          : caseScopes[item.slug];
    if (!scopeCode) continue;
    await prisma.contentKnowledgeScope.upsert({
      where: {
        contentItemId_knowledgeScopeId: {
          contentItemId: item.id,
          knowledgeScopeId: scopeByCode.get(scopeCode)!,
        },
      },
      update: { relationshipType: 'PRIMARY', isRequired: true },
      create: {
        contentItemId: item.id,
        knowledgeScopeId: scopeByCode.get(scopeCode)!,
        relationshipType: 'PRIMARY',
        isRequired: true,
      },
    });
  }

  const testPassword = process.env.KNOWLEDGE_TEST_PASSWORD;
  if (testPassword) {
    if (testPassword.length < 14) throw new Error('KNOWLEDGE_TEST_PASSWORD must be at least 14 characters.');
    const passwordHash = await hash(testPassword, 12);
    const paymentMember = await ensureTestUser(
      'payment.member@example.test', 'Payment-only Member', 'MEMBER', passwordHash, admin.id,
    );
    const multiMember = await ensureTestUser(
      'multi.member@example.test', 'Multi-domain Member', 'MEMBER', passwordHash, admin.id,
    );
    const contributor = await ensureTestUser(
      'payment.contributor@example.test', 'Payment Contributor', 'CONTRIBUTOR', passwordHash, admin.id,
    );
    const reviewer = await ensureTestUser(
      'payment.reviewer@example.test', 'Payment Reviewer', 'REVIEWER', passwordHash, admin.id,
    );
    const payments = scopeByCode.get('PAYMENTS')!;
    await upsertScopeGrant(paymentMember.id, payments, 'VIEW', admin.id, 'Non-production Payment-only test access.');
    for (const code of ['PAYMENTS', 'CARDS', 'SECURITY_ACCESS']) {
      await upsertScopeGrant(multiMember.id, scopeByCode.get(code)!, 'VIEW', admin.id, 'Non-production multi-domain test access.');
    }
    for (const permission of ['VIEW', 'CREATE', 'EDIT'] as const) {
      await upsertScopeGrant(contributor.id, payments, permission, admin.id, 'Non-production Payment contributor access.');
    }
    for (const permission of ['VIEW', 'REVIEW', 'PUBLISH'] as const) {
      await upsertScopeGrant(reviewer.id, payments, permission, admin.id, 'Non-production Payment reviewer access.');
    }
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'KNOWLEDGE_ACCESS_NON_PRODUCTION_BACKFILL',
      entityType: 'KnowledgeScope',
      entityId: 'initial-taxonomy',
      metadataJson: JSON.stringify({ environment: environment.APP_ENV }),
    },
  });
  const unmapped = await prisma.contentItem.count({ where: { knowledgeScopes: { none: {} } } });
  console.log(`Knowledge access setup complete. Active scopes: ${scopes.length}. Unmapped content requiring Admin review: ${unmapped}.`);
}

main()
  .finally(() => prisma.$disconnect());
