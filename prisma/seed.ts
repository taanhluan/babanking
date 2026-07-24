import { PrismaClient, ContentType, RevisionStatus, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { bankingJourneyContent, baPracticeContent, caseStudyContent, careerLevelContent } from '../src/data/content';
import {
  assertDatabaseOperationAllowed,
  parseServerEnvironment,
} from '../src/server/environment-core';
import { loadEnvironmentFiles } from '../scripts/load-environment-files';

loadEnvironmentFiles();
const seedEnvironment = parseServerEnvironment(process.env, { requireAuthSecret: false });
assertDatabaseOperationAllowed('seed-development', seedEnvironment);
const prisma = new PrismaClient();
const groups = [
  [ContentType.BANKING_JOURNEY, bankingJourneyContent],
  [ContentType.BA_PRACTICE, baPracticeContent],
  [ContentType.CASE_STUDY, caseStudyContent],
  [ContentType.CAREER_LEVEL, careerLevelContent],
] as const;

async function main() {
  let adminId: string | undefined;
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error('SEED_ADMIN_PASSWORD must contain at least 12 characters.');
    const admin = await prisma.user.upsert({
      where: { email },
      update: { name: process.env.SEED_ADMIN_NAME || 'Platform Administrator', role: Role.ADMIN, isActive: true, accountStatus: 'ACTIVE' },
      create: { email, name: process.env.SEED_ADMIN_NAME || 'Platform Administrator', passwordHash: await hash(password, 12), role: Role.ADMIN, accountStatus: 'ACTIVE' },
    });
    adminId = admin.id;
  }
  for (const [type, records] of groups) {
    for (const record of records) {
      const item = await prisma.contentItem.upsert({
        where: { type_slug: { type, slug: record.slug } },
        update: { isArchived: false, stableKey: `${type}:${record.slug}` },
        create: { type, slug: record.slug, stableKey: `${type}:${record.slug}`, ownerId: adminId },
      });
      const revision = await prisma.contentRevision.upsert({
        where: { contentItemId_version: { contentItemId: item.id, version: 1 } },
        update: { contentJson: JSON.stringify(record) },
        create: { contentItemId: item.id, version: 1, status: RevisionStatus.PUBLISHED, contentJson: JSON.stringify(record), authorId: adminId, publishedAt: new Date() },
      });
      await prisma.contentItem.update({ where: { id: item.id }, data: { publishedRevisionId: revision.id } });
      const englishTranslation = await prisma.contentTranslation.upsert({
        where: { contentItemId_locale: { contentItemId: item.id, locale: 'en' } },
        update: { slug: record.slug, title: record.title, summary: record.summary, status: 'PUBLISHED' },
        create: { contentItemId: item.id, locale: 'en', slug: record.slug, title: record.title, summary: record.summary, status: 'PUBLISHED', ownerId: adminId },
      });
      const englishRevision = await prisma.translationRevision.upsert({
        where: { contentTranslationId_version: { contentTranslationId: englishTranslation.id, version: 1 } },
        update: { contentJson: JSON.stringify(record), status: 'PUBLISHED' },
        create: { contentTranslationId: englishTranslation.id, version: 1, status: 'PUBLISHED', contentJson: JSON.stringify(record), authorId: adminId, publishedAt: new Date() },
      });
      await prisma.contentTranslation.update({ where: { id: englishTranslation.id }, data: { publishedRevisionId: englishRevision.id } });
      await prisma.contentTranslation.upsert({
        where: { contentItemId_locale: { contentItemId: item.id, locale: 'vi' } },
        update: {},
        create: { contentItemId: item.id, locale: 'vi', slug: record.slug, title: record.title, summary: record.summary, status: 'NOT_STARTED', ownerId: adminId },
      });
    }
  }
  const samplePlan = await prisma.membershipPlan.upsert({
    where: { code: 'DEV_PROFESSIONAL_ANNUAL' },
    update: {},
    create: {
      name: 'Development Professional Membership',
      code: 'DEV_PROFESSIONAL_ANNUAL',
      description: 'Development-only sample plan. Configure approved commercial pricing before making a plan public.',
      price: 0,
      currency: 'VND',
      billingPeriod: 'ANNUAL',
      durationDays: 365,
      featuresJson: JSON.stringify(['Complete knowledge library', 'Member search', 'Bookmarks and reading history']),
      isActive: true,
      isPublic: false,
    },
  });
  for (const translation of [
    { locale: 'en', name: 'Development Professional Membership', description: 'Development-only sample plan. Configure approved commercial pricing before publishing.', features: ['Complete knowledge library', 'Member search', 'Bookmarks and reading history'] },
    { locale: 'vi', name: 'Gói thành viên chuyên nghiệp (môi trường phát triển)', description: 'Gói mẫu chỉ dành cho môi trường phát triển. Cần cấu hình mức giá thương mại đã được phê duyệt trước khi công khai.', features: ['Toàn bộ thư viện kiến thức', 'Tìm kiếm dành cho thành viên', 'Nội dung đã lưu và lịch sử đọc'] },
  ]) await prisma.membershipPlanTranslation.upsert({
    where: { planId_locale: { planId: samplePlan.id, locale: translation.locale } },
    update: { name: translation.name, description: translation.description, featuresJson: JSON.stringify(translation.features) },
    create: { planId: samplePlan.id, locale: translation.locale, name: translation.name, description: translation.description, featuresJson: JSON.stringify(translation.features) },
  });
  const memberEmail = process.env.SEED_MEMBER_EMAIL?.trim().toLowerCase();
  const memberPassword = process.env.SEED_MEMBER_PASSWORD;
  if (memberEmail && memberPassword && adminId) {
    if (memberPassword.length < 12) throw new Error('SEED_MEMBER_PASSWORD must contain at least 12 characters.');
    const member = await prisma.user.upsert({
      where: { email: memberEmail },
      update: { isActive: true, accountStatus: 'ACTIVE' },
      create: { email: memberEmail, name: process.env.SEED_MEMBER_NAME || 'Development Member', passwordHash: await hash(memberPassword, 12), accountStatus: 'ACTIVE' },
    });
    const membership = await prisma.membership.findFirst({ where: { userId: member.id, status: 'ACTIVE' } }) ?? await prisma.membership.create({
      data: { userId: member.id, planId: samplePlan.id, status: 'ACTIVE', accessSource: 'PAID', startsAt: new Date(), expiresAt: new Date(Date.now() + 365 * 86400000), createdById: adminId },
    });
    if (!await prisma.paymentRecord.findFirst({ where: { membershipId: membership.id, status: 'PAID' } })) await prisma.paymentRecord.create({
      data: { userId: member.id, membershipId: membership.id, planId: samplePlan.id, amount: 0, currency: 'VND', method: 'DEVELOPMENT_SEED', providerReference: `DEV-${member.id}`, status: 'PAID', paidAt: new Date(), verifiedAt: new Date(), verifiedById: adminId, adminNote: 'Development-only seed record.' },
    });
  }
}
main().finally(() => prisma.$disconnect());
