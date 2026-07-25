import { PrismaClient, Role } from '@prisma/client';
import {
  assertDatabaseOperationAllowed,
  parseServerEnvironment,
} from '../src/server/environment-core';
import { loadEnvironmentFiles } from './load-environment-files';

loadEnvironmentFiles();

const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
assertDatabaseOperationAllowed('cleanup-development', environment);

const keepAdminEmail = process.env.CLEANUP_KEEP_ADMIN_EMAIL?.trim().toLowerCase();
if (!keepAdminEmail) {
  throw new Error('CLEANUP_KEEP_ADMIN_EMAIL is required.');
}

const prisma = new PrismaClient();

const dataTables = [
  'MembershipPlanTranslation',
  'AccessRequest',
  'Membership',
  'PaymentRecord',
  'AccountActivationToken',
  'RenewalRequest',
  'JourneyBlock',
  'JourneySection',
  'JourneyModule',
  'JourneyAsset',
  'TranslationRevision',
  'ContentTranslation',
  'RevisionBlock',
  'RevisionSection',
  'RevisionModule',
  'ContentRevision',
  'Bookmark',
  'ReadingActivity',
  'UserCareerPreference',
  'AuditLog',
  'ContentKnowledgeScope',
  'UserScopeGrant',
  'UserContentGrant',
  'KnowledgePackagePermission',
  'UserKnowledgePackageAssignment',
  'KnowledgePackage',
  'KnowledgeScope',
  'ContentItem',
  'MembershipPlan',
] as const;

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: keepAdminEmail },
    select: { id: true, email: true },
  });
  if (!admin) {
    throw new Error(`Cleanup blocked: admin account ${keepAdminEmail} does not exist.`);
  }

  const usersBefore = await prisma.user.count();
  const quotedTables = dataTables.map((table) => `"${table}"`).join(', ');

  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables}`);
    await transaction.user.deleteMany({ where: { id: { not: admin.id } } });
    await transaction.user.update({
      where: { id: admin.id },
      data: {
        email: keepAdminEmail,
        role: Role.ADMIN,
        isActive: true,
        accountStatus: 'ACTIVE',
      },
    });
  }, { timeout: 30_000 });

  const [usersAfter, retainedAdmin] = await Promise.all([
    prisma.user.count(),
    prisma.user.findUnique({
      where: { id: admin.id },
      select: { email: true, role: true, isActive: true, accountStatus: true },
    }),
  ]);

  if (usersAfter !== 1 || !retainedAdmin || retainedAdmin.email !== keepAdminEmail) {
    throw new Error('Cleanup verification failed.');
  }

  console.log(`Development cleanup complete. Removed ${usersBefore - usersAfter} users.`);
  console.log(`Retained admin: ${retainedAdmin.email} (${retainedAdmin.role}, ${retainedAdmin.accountStatus})`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
