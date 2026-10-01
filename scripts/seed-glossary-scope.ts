import { PrismaClient } from '@prisma/client';
import { assertDatabaseEnvironmentSafe, parseServerEnvironment } from '../src/server/environment-core';
import { loadEnvironmentFiles } from './load-environment-files';

/**
 * Creates the shared BANKING_GLOSSARY Knowledge Scope and grants VIEW on it to every active
 * Knowledge Package. Read-only verification without --apply; idempotent and audited with it.
 */
const releaseId = 'glossary-scope-development-v1';
const scopeCode = 'BANKING_GLOSSARY';

loadEnvironmentFiles();
const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
assertDatabaseEnvironmentSafe(environment);
if (environment.APP_ENV !== 'development' || environment.DATABASE_ENVIRONMENT !== 'development') {
  throw new Error('Glossary scope setup is allowed only with a development application and development database.');
}

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

async function plan() {
  const [scope, packages] = await Promise.all([
    prisma.knowledgeScope.findUnique({ where: { code: scopeCode }, select: { id: true, isActive: true } }),
    prisma.knowledgePackage.findMany({ where: { isActive: true }, select: { id: true, code: true, permissions: { where: { knowledgeScope: { code: scopeCode }, permission: 'VIEW' }, select: { id: true } } }, orderBy: { displayOrder: 'asc' } }),
  ]);
  return { scope, missingGrants: packages.filter((pkg) => !pkg.permissions.length).map((pkg) => ({ id: pkg.id, code: pkg.code })) };
}

async function main() {
  const before = await plan();
  console.log(JSON.stringify({ releaseId, scopeExists: Boolean(before.scope), missingPackageGrants: before.missingGrants.map((pkg) => pkg.code) }));
  if (!apply) return;
  if (before.scope && !before.missingGrants.length) {
    console.log('Nothing to apply.');
    return;
  }
  await prisma.$transaction(async (tx) => {
    const scope = before.scope ?? await tx.knowledgeScope.create({
      data: {
        code: scopeCode,
        type: 'CUSTOM',
        nameEn: 'Banking Glossary & Regulations',
        nameVi: 'Thuật ngữ & Quy định ngân hàng',
        descriptionEn: 'Banking terms and Vietnamese and international regulations for business analysts.',
        descriptionVi: 'Thuật ngữ ngân hàng và các quy định Việt Nam, quốc tế dành cho Business Analyst.',
        displayOrder: 100,
      },
      select: { id: true },
    });
    for (const pkg of before.missingGrants) {
      await tx.knowledgePackagePermission.create({ data: { packageId: pkg.id, knowledgeScopeId: scope.id, permission: 'VIEW' } });
    }
    await tx.auditLog.create({
      data: {
        actorId: null,
        action: 'GLOSSARY_SCOPE_CONFIGURED',
        entityType: 'KnowledgeScope',
        entityId: scope.id,
        metadataJson: JSON.stringify({ environment: environment.APP_ENV, releaseId, createdScope: !before.scope, grantedPackages: before.missingGrants.map((pkg) => pkg.code) }),
      },
    });
  }, { timeout: 30_000 });
  const after = await plan();
  if (!after.scope || after.missingGrants.length) throw new Error('Glossary scope read-back failed.');
  console.log(JSON.stringify({ releaseId, applied: true, scopeExists: true, missingPackageGrants: [] }));
}

main().finally(() => prisma.$disconnect());
