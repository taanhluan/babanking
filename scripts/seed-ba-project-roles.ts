import { PrismaClient } from '@prisma/client';
import { assertDatabaseEnvironmentSafe, parseServerEnvironment } from '../src/server/environment-core';
import { loadEnvironmentFiles } from './load-environment-files';

/**
 * Seeds the resource-allocation project role catalogue (proposal section 15.2).
 * Read-only verification without --apply; idempotent (matches by name) and audited with it.
 */
const releaseId = 'ba-project-roles-development-v1';
const roles = ['Product Owner', 'Business Analyst', 'Senior Business Analyst', 'Business Consultant', 'Sr. System Analyst', 'BA Lead'];

loadEnvironmentFiles();
const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
assertDatabaseEnvironmentSafe(environment);
if (environment.APP_ENV !== 'development' || environment.DATABASE_ENVIRONMENT !== 'development') {
  throw new Error('BA project role seeding is allowed only with a development application and development database.');
}

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

async function pending() {
  const existing = await prisma.baProjectRole.findMany({ where: { name: { in: roles } }, select: { name: true } });
  return roles.filter((name) => !existing.some((entry) => entry.name === name));
}

async function main() {
  const missing = await pending();
  console.log(JSON.stringify({ releaseId, total: roles.length, existing: roles.length - missing.length, pending: missing.length }));
  if (!apply) return;
  if (!missing.length) {
    console.log('Nothing to apply.');
    return;
  }
  await prisma.$transaction(async (tx) => {
    for (const name of missing) {
      const created = await tx.baProjectRole.create({ data: { name, sortOrder: roles.indexOf(name) }, select: { id: true } });
      await tx.auditLog.create({ data: { actorId: null, action: 'BA_PROJECT_ROLE_SEEDED', entityType: 'BaProjectRole', entityId: created.id, metadataJson: JSON.stringify({ environment: environment.APP_ENV, releaseId, roleId: created.id }) } });
    }
  }, { timeout: 30_000 });
  if ((await pending()).length) throw new Error('BA project role read-back failed.');
  console.log(JSON.stringify({ releaseId, applied: missing.length, pending: 0 }));
}

main().finally(() => prisma.$disconnect());
