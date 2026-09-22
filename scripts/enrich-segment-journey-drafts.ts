import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { assertDatabaseOperationAllowed, parseServerEnvironment } from '../src/server/environment-core';
import { buildSegmentJourneyDraftContent, segmentJourneyBlueprints } from '../src/server/customer-segment/segment-journey-blueprints';
import { buildSegmentJourneyDetailedContent } from '../src/server/customer-segment/segment-journey-detailed-content';
import { loadEnvironmentFiles } from './load-environment-files';

loadEnvironmentFiles();
const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
assertDatabaseOperationAllowed('seed-development', environment);

const releaseId = 'segment-journey-phase-3-development-v1';
const apply = process.argv.includes('--apply');
if (apply && process.env.SEGMENT_JOURNEY_PHASE3_CONFIRM !== releaseId) throw new Error(`Set SEGMENT_JOURNEY_PHASE3_CONFIRM=${releaseId} to apply.`);
const authorEmail = process.env.SEGMENT_JOURNEY_AUTHOR_EMAIL?.trim().toLowerCase();
if (apply && !authorEmail) throw new Error('SEGMENT_JOURNEY_AUTHOR_EMAIL is required to apply.');

const db = new PrismaClient();
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

async function main() {
  const slugs = segmentJourneyBlueprints.map((item) => item.slug);
  const [items, author] = await Promise.all([
    db.contentItem.findMany({ where: { type: 'BANKING_JOURNEY', slug: { in: slugs } }, include: { revisions: { orderBy: { version: 'asc' } }, knowledgeScopes: { include: { knowledgeScope: { select: { code: true } } } } } }),
    authorEmail ? db.user.findUnique({ where: { email: authorEmail }, select: { id: true, role: true, isActive: true } }) : null,
  ]);
  if (items.length !== segmentJourneyBlueprints.length) throw new Error(`Expected ${segmentJourneyBlueprints.length} Phase 2 Journey identities; found ${items.length}.`);
  if (apply && (!author || !author.isActive || author.role !== 'ADMIN')) throw new Error('An active Admin author is required.');

  const blueprintBySlug = new Map(segmentJourneyBlueprints.map((blueprint) => [blueprint.slug, blueprint]));
  const audits = await db.auditLog.findMany({ where: { entityType: 'ContentItem', entityId: { in: items.map((item) => item.id) }, action: { in: ['SEGMENT_JOURNEY_PHASE2_DRAFT_CREATED', 'SEGMENT_JOURNEY_PHASE3_CONTENT_ENRICHED'] } }, select: { entityId: true, action: true } });
  const pending: typeof items = [];
  for (const item of items) {
    const blueprint = blueprintBySlug.get(item.slug)!;
    const phase2Json = JSON.stringify(buildSegmentJourneyDraftContent(blueprint));
    const phase3Json = JSON.stringify(buildSegmentJourneyDetailedContent(blueprint));
    const revision = item.revisions[0];
    const scope = item.knowledgeScopes[0];
    const preview = item.previewJson ? JSON.parse(item.previewJson) as { plannedSegment?: unknown } : null;
    const phase2Audits = audits.filter((audit) => audit.entityId === item.id && audit.action === 'SEGMENT_JOURNEY_PHASE2_DRAFT_CREATED').length;
    const phase3Audits = audits.filter((audit) => audit.entityId === item.id && audit.action === 'SEGMENT_JOURNEY_PHASE3_CONTENT_ENRICHED').length;
    if (item.publishedRevisionId || item.isArchived || item.revisions.length !== 1 || revision?.version !== 1 || revision?.status !== 'DRAFT' || revision.reviewerId
      || item.knowledgeScopes.length !== 1 || scope?.knowledgeScope.code !== blueprint.scopeCode || scope.relationshipType !== 'PRIMARY' || !scope.isRequired
      || preview?.plannedSegment !== blueprint.segment || phase2Audits !== 1) throw new Error(`Phase 2 invariant failed: ${item.slug}`);
    if (revision.contentJson === phase2Json && phase3Audits === 0) pending.push(item);
    else if (revision.contentJson !== phase3Json || phase3Audits !== 1) throw new Error(`Phase 3 content conflicts with governed artifact: ${item.slug}`);
  }
  console.log(JSON.stringify({ environment: environment.APP_ENV, releaseId, mode: apply ? 'apply' : 'verify', detailed: items.length - pending.length, pending: pending.length, total: items.length }, null, 2));
  if (!apply || !pending.length) return;

  await db.$transaction(async (tx) => {
    for (const item of pending) {
      const blueprint = blueprintBySlug.get(item.slug)!;
      const beforeJson = item.revisions[0].contentJson;
      const content = buildSegmentJourneyDetailedContent(blueprint);
      const contentJson = JSON.stringify(content);
      await tx.contentRevision.update({ where: { id: item.revisions[0].id }, data: { contentJson, schemaVersion: 1, authorId: author!.id } });
      await tx.contentItem.update({ where: { id: item.id }, data: { previewJson: JSON.stringify({ title: content.title, summary: content.summary, plannedSegment: blueprint.segment }) } });
      await tx.auditLog.create({ data: { actorId: author!.id, action: 'SEGMENT_JOURNEY_PHASE3_CONTENT_ENRICHED', entityType: 'ContentItem', entityId: item.id, metadataJson: JSON.stringify({ environment: environment.APP_ENV, releaseId, revisionId: item.revisions[0].id, beforeHash: hash(beforeJson), afterHash: hash(contentJson), modules: content.modules?.length ?? 0, sections: content.modules?.reduce((count, entry) => count + entry.sections.length, 0) ?? 0 }) } });
    }
  }, { maxWait: 10_000, timeout: 60_000 });
  console.log(JSON.stringify({ enriched: pending.length, status: 'DRAFT_ONLY', submitted: 0, published: 0, assigned: 0 }, null, 2));
}

main().finally(() => db.$disconnect());
