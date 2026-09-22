import { PrismaClient } from '@prisma/client';
import { assertDatabaseOperationAllowed, parseServerEnvironment } from '../src/server/environment-core';
import { assertDraftSubmittable } from '../src/server/cms/journey-cms-policy';
import { parseJourneyContentJson } from '../src/server/cms/journey-content-schema';
import { segmentJourneyBlueprints } from '../src/server/customer-segment/segment-journey-blueprints';
import { buildSegmentJourneyDetailedContent } from '../src/server/customer-segment/segment-journey-detailed-content';
import { loadEnvironmentFiles } from './load-environment-files';

loadEnvironmentFiles();
const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
assertDatabaseOperationAllowed('seed-development', environment);

const releaseId = 'segment-journey-phase-3-submit-development-v1';
const apply = process.argv.includes('--apply');
if (apply && process.env.SEGMENT_JOURNEY_SUBMIT_CONFIRM !== releaseId) {
  throw new Error(`Set SEGMENT_JOURNEY_SUBMIT_CONFIRM=${releaseId} to apply.`);
}
const actorEmail = process.env.SEGMENT_JOURNEY_AUTHOR_EMAIL?.trim().toLowerCase();
if (apply && !actorEmail) throw new Error('SEGMENT_JOURNEY_AUTHOR_EMAIL is required to apply.');

const db = new PrismaClient();

async function main() {
  const slugs = segmentJourneyBlueprints.map((item) => item.slug);
  const [items, actor] = await Promise.all([
    db.contentItem.findMany({
      where: { type: 'BANKING_JOURNEY', slug: { in: slugs } },
      include: { revisions: { orderBy: { version: 'asc' } } },
    }),
    actorEmail ? db.user.findUnique({ where: { email: actorEmail }, select: { id: true, role: true, isActive: true } }) : null,
  ]);
  if (items.length !== segmentJourneyBlueprints.length) throw new Error(`Expected ${segmentJourneyBlueprints.length} Journey identities; found ${items.length}.`);
  if (apply && (!actor || !actor.isActive || actor.role !== 'ADMIN')) throw new Error('An active Admin submitter is required.');

  const blueprintBySlug = new Map(segmentJourneyBlueprints.map((blueprint) => [blueprint.slug, blueprint]));
  const audits = await db.auditLog.findMany({
    where: { action: 'JOURNEY_SUBMITTED_FOR_REVIEW', entityType: 'ContentRevision', entityId: { in: items.flatMap((item) => item.revisions.map((revision) => revision.id)) } },
    select: { entityId: true },
  });
  const pending: Array<{ itemId: string; revisionId: string }> = [];
  for (const item of items) {
    const blueprint = blueprintBySlug.get(item.slug)!;
    const revision = item.revisions[0];
    const expectedJson = JSON.stringify(buildSegmentJourneyDetailedContent(blueprint));
    if (item.publishedRevisionId || item.isArchived || item.revisions.length !== 1 || !revision || revision.version !== 1
      || revision.authorId !== actor?.id || revision.contentJson !== expectedJson || revision.reviewerId || revision.reviewedAt || revision.publishedAt) {
      throw new Error(`Submission invariant failed: ${item.slug}`);
    }
    parseJourneyContentJson(revision.contentJson);
    const submitAuditCount = audits.filter((audit) => audit.entityId === revision.id).length;
    if (revision.status === 'DRAFT' && !revision.submittedAt && submitAuditCount === 0) {
      if (!actor) throw new Error('Submitter is required to verify pending Drafts.');
      assertDraftSubmittable({ role: actor.role, actorId: actor.id, authorId: revision.authorId, status: revision.status });
      pending.push({ itemId: item.id, revisionId: revision.id });
    } else if (revision.status !== 'IN_REVIEW' || !revision.submittedAt || submitAuditCount !== 1) {
      throw new Error(`Submission state conflicts with governed workflow: ${item.slug}`);
    }
  }
  console.log(JSON.stringify({ environment: environment.APP_ENV, releaseId, mode: apply ? 'apply' : 'verify', inReview: items.length - pending.length, pending: pending.length, total: items.length }, null, 2));
  if (!apply || !pending.length) return;

  await db.$transaction(async (tx) => {
    const submittedAt = new Date();
    for (const entry of pending) {
      await tx.contentRevision.update({ where: { id: entry.revisionId }, data: { status: 'IN_REVIEW', submittedAt, reviewNote: null } });
      await tx.auditLog.create({
        data: {
          actorId: actor!.id,
          action: 'JOURNEY_SUBMITTED_FOR_REVIEW',
          entityType: 'ContentRevision',
          entityId: entry.revisionId,
          metadataJson: JSON.stringify({ environment: environment.APP_ENV, releaseId, contentItemId: entry.itemId, revisionId: entry.revisionId }),
        },
      });
    }
  }, { maxWait: 10_000, timeout: 60_000 });
  console.log(JSON.stringify({ submitted: pending.length, status: 'IN_REVIEW', reviewed: 0, published: 0, assigned: 0 }, null, 2));
}

main().finally(() => db.$disconnect());
