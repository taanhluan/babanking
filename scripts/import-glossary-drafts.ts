import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { assertDatabaseEnvironmentSafe, parseServerEnvironment } from '../src/server/environment-core';
import { validateGlossaryStarter } from '../src/server/glossary/glossary-starter';
import { glossaryPreviewJson } from '../src/server/glossary/glossary-domain';
import { loadEnvironmentFiles } from './load-environment-files';

/**
 * Imports a glossary starter file as version 1 DRAFT entries. Never submits or publishes.
 * Without --apply it only validates and reports. Existing slugs are skipped, never overwritten.
 * Usage: npm run db:import:glossary-drafts -- [file] [--apply]   (author: GLOSSARY_IMPORT_AUTHOR_EMAIL)
 */
const scopeCode = 'BANKING_GLOSSARY';

loadEnvironmentFiles();
const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
assertDatabaseEnvironmentSafe(environment);
if (environment.APP_ENV !== 'development' || environment.DATABASE_ENVIRONMENT !== 'development') {
  throw new Error('Glossary draft import is allowed only with a development application and development database.');
}

const apply = process.argv.includes('--apply');
const filePath = process.argv.slice(2).find((value) => !value.startsWith('--')) ?? 'content/glossary/banking-glossary-starter-v1.json';
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.contentItem.findMany({ where: { type: 'GLOSSARY_ENTRY' }, select: { slug: true } });
  const existingSlugs = new Set(existing.map((item) => item.slug));
  const file = validateGlossaryStarter(JSON.parse(readFileSync(filePath, 'utf8')), existingSlugs);
  const journeySlugs = [...new Set(file.entries.flatMap((entry) => entry.content.relatedJourneySlugs))];
  const journeys = await prisma.contentItem.findMany({ where: { type: 'BANKING_JOURNEY', slug: { in: journeySlugs }, isArchived: false, publishedRevisionId: { not: null } }, select: { slug: true } });
  const missingJourneys = journeySlugs.filter((slug) => !journeys.some((journey) => journey.slug === slug));
  if (missingJourneys.length) throw new Error(`Unpublished or missing Journeys: ${missingJourneys.join(', ')}.`);
  const pending = file.entries.filter((entry) => !existingSlugs.has(entry.slug));
  console.log(JSON.stringify({ releaseId: file.releaseId, file: filePath, total: file.entries.length, existing: file.entries.length - pending.length, pending: pending.length }));
  if (!apply || !pending.length) return;

  const authorEmail = process.env.GLOSSARY_IMPORT_AUTHOR_EMAIL?.trim().toLowerCase();
  if (!authorEmail) throw new Error('Set GLOSSARY_IMPORT_AUTHOR_EMAIL to the active ADMIN or CONTRIBUTOR who will author the drafts.');
  const [author, scope] = await Promise.all([
    prisma.user.findFirst({ where: { email: authorEmail, isActive: true, role: { in: ['ADMIN', 'CONTRIBUTOR'] } }, select: { id: true } }),
    prisma.knowledgeScope.findFirst({ where: { code: scopeCode, isActive: true }, select: { id: true } }),
  ]);
  if (!author) throw new Error('Import author must be an active ADMIN or CONTRIBUTOR.');
  if (!scope) throw new Error(`Knowledge scope ${scopeCode} is not configured; run npm run db:seed:glossary-scope -- --apply first.`);

  await prisma.$transaction(async (tx) => {
    for (const { slug, content } of pending) {
      const contentJson = JSON.stringify(content);
      const item = await tx.contentItem.create({
        data: {
          type: 'GLOSSARY_ENTRY', slug, stableKey: `glossary:${slug}`, ownerId: author.id, previewJson: glossaryPreviewJson(content),
          knowledgeScopes: { create: { knowledgeScopeId: scope.id, relationshipType: 'PRIMARY', isRequired: true } },
        },
      });
      const revision = await tx.contentRevision.create({ data: { contentItemId: item.id, version: 1, contentJson, authorId: author.id } });
      if (createHash('sha256').update(revision.contentJson).digest('hex') !== createHash('sha256').update(contentJson).digest('hex')) throw new Error(`Read-back mismatch for ${slug}.`);
      await tx.auditLog.create({ data: { actorId: author.id, action: 'GLOSSARY_ENTRY_IMPORTED_AS_DRAFT', entityType: 'ContentItem', entityId: item.id, metadataJson: JSON.stringify({ environment: environment.APP_ENV, releaseId: file.releaseId, slug, revisionId: revision.id, knowledgeScopeId: scope.id }) } });
    }
  }, { timeout: 120_000, maxWait: 10_000 });

  const after = await prisma.contentItem.findMany({ where: { type: 'GLOSSARY_ENTRY', slug: { in: pending.map((entry) => entry.slug) } }, select: { slug: true, publishedRevisionId: true, revisions: { select: { status: true, version: true } }, knowledgeScopes: { select: { knowledgeScopeId: true } } } });
  const invalid = after.filter((item) => item.publishedRevisionId || item.revisions.length !== 1 || item.revisions[0].status !== 'DRAFT' || item.knowledgeScopes.length !== 1);
  if (after.length !== pending.length || invalid.length) throw new Error('Glossary draft import read-back failed.');
  console.log(JSON.stringify({ releaseId: file.releaseId, applied: true, createdDrafts: after.length }));
}

main().finally(() => prisma.$disconnect());
