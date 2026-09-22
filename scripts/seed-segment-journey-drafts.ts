import { PrismaClient } from '@prisma/client';
import { assertDatabaseOperationAllowed, parseServerEnvironment } from '../src/server/environment-core';
import { buildSegmentJourneyDraftContent, segmentJourneyBlueprints } from '../src/server/customer-segment/segment-journey-blueprints';
import { loadEnvironmentFiles } from './load-environment-files';

loadEnvironmentFiles();
const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
assertDatabaseOperationAllowed('seed-development', environment);

const releaseId = 'segment-journey-phase-2-development-v1';
const apply = process.argv.includes('--apply');
if (apply && process.env.SEGMENT_JOURNEY_PHASE2_CONFIRM !== releaseId) {
  throw new Error(`Set SEGMENT_JOURNEY_PHASE2_CONFIRM=${releaseId} to apply.`);
}

const authorEmail = process.env.SEGMENT_JOURNEY_AUTHOR_EMAIL?.trim().toLowerCase();
if (apply && !authorEmail) throw new Error('SEGMENT_JOURNEY_AUTHOR_EMAIL is required to apply.');

const db = new PrismaClient();

async function main() {
  const slugs = segmentJourneyBlueprints.map((item) => item.slug);
  const [existing, scopes, author] = await Promise.all([
    db.contentItem.findMany({ where: { type: 'BANKING_JOURNEY', slug: { in: slugs } }, include: { revisions: { orderBy: { version: 'asc' } }, knowledgeScopes: { include: { knowledgeScope: { select: { code: true } } } } } }),
    db.knowledgeScope.findMany({ where: { code: { in: [...new Set(segmentJourneyBlueprints.map((item) => item.scopeCode))] }, isActive: true }, select: { id: true, code: true } }),
    authorEmail ? db.user.findUnique({ where: { email: authorEmail }, select: { id: true, role: true, isActive: true } }) : null,
  ]);
  if (apply && (!author || !author.isActive || author.role !== 'ADMIN')) throw new Error('An active Admin author is required.');
  const scopeByCode = new Map(scopes.map((scope) => [scope.code, scope.id]));
  const missingScopes = [...new Set(segmentJourneyBlueprints.map((item) => item.scopeCode))].filter((code) => !scopeByCode.has(code));
  if (missingScopes.length) throw new Error(`Missing active Knowledge Scopes: ${missingScopes.join(', ')}`);

  const expectedJson = new Map(segmentJourneyBlueprints.map((blueprint) => [blueprint.slug, JSON.stringify(buildSegmentJourneyDraftContent(blueprint))]));
  const blueprintBySlug = new Map(segmentJourneyBlueprints.map((blueprint) => [blueprint.slug, blueprint]));
  const audits = existing.length ? await db.auditLog.findMany({ where: { action: 'SEGMENT_JOURNEY_PHASE2_DRAFT_CREATED', entityType: 'ContentItem', entityId: { in: existing.map((item) => item.id) } }, select: { entityId: true } }) : [];
  for (const item of existing) {
    const blueprint = blueprintBySlug.get(item.slug)!;
    const preview = item.previewJson ? JSON.parse(item.previewJson) as { plannedSegment?: unknown } : null;
    const scope = item.knowledgeScopes[0];
    if (item.publishedRevisionId || item.isArchived
      || item.revisions.length !== 1 || item.revisions[0]?.version !== 1 || item.revisions[0]?.status !== 'DRAFT'
      || item.revisions[0]?.contentJson !== expectedJson.get(item.slug)
      || item.knowledgeScopes.length !== 1 || scope?.knowledgeScope.code !== blueprint.scopeCode || scope.relationshipType !== 'PRIMARY' || !scope.isRequired
      || preview?.plannedSegment !== blueprint.segment
      || audits.filter((audit) => audit.entityId === item.id).length !== 1) {
      throw new Error(`Existing Journey conflicts with Phase 2 blueprint: ${item.slug}`);
    }
  }
  const existingSlugs = new Set(existing.map((item) => item.slug));
  const pending = segmentJourneyBlueprints.filter((item) => !existingSlugs.has(item.slug));
  console.log(JSON.stringify({ environment: environment.APP_ENV, releaseId, mode: apply ? 'apply' : 'verify', existing: existing.length, pending: pending.length, total: segmentJourneyBlueprints.length }, null, 2));
  if (!apply || !pending.length) return;

  await db.$transaction(async (tx) => {
    for (const blueprint of pending) {
      const contentJson = expectedJson.get(blueprint.slug)!;
      const content = buildSegmentJourneyDraftContent(blueprint);
      const item = await tx.contentItem.create({
        data: {
          type: 'BANKING_JOURNEY',
          slug: blueprint.slug,
          stableKey: `banking-journey:${blueprint.slug}`,
          ownerId: author!.id,
          previewJson: JSON.stringify({ title: content.title, summary: content.summary, plannedSegment: blueprint.segment }),
          knowledgeScopes: { create: { knowledgeScopeId: scopeByCode.get(blueprint.scopeCode)!, relationshipType: 'PRIMARY', isRequired: true } },
        },
      });
      const revision = await tx.contentRevision.create({ data: { contentItemId: item.id, version: 1, status: 'DRAFT', schemaVersion: 1, contentJson, authorId: author!.id } });
      await tx.auditLog.create({ data: { actorId: author!.id, action: 'SEGMENT_JOURNEY_PHASE2_DRAFT_CREATED', entityType: 'ContentItem', entityId: item.id, metadataJson: JSON.stringify({ environment: environment.APP_ENV, releaseId, revisionId: revision.id, plannedSegment: blueprint.segment, knowledgeScopeCode: blueprint.scopeCode }) } });
    }
  }, { maxWait: 10_000, timeout: 60_000 });
  console.log(JSON.stringify({ created: pending.length, status: 'DRAFT_ONLY', published: 0, assigned: 0 }, null, 2));
}

main().finally(() => db.$disconnect());
