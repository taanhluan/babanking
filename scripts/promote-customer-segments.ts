import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { loadEnvironmentFiles } from './load-environment-files';
import { assertDatabaseEnvironmentSafe, parseServerEnvironment } from '../src/server/environment-core';
import { canonicalCustomerSegmentJson, customerSegmentContentHash, customerSegmentReleaseSchema } from '../src/server/customer-segment/customer-segment-release';

loadEnvironmentFiles();
const mode = process.argv[2];
if (!['--verify', '--apply', '--rollback'].includes(mode)) throw new Error('Use --verify, --apply, or --rollback.');
const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
const artifactPath = path.resolve(process.cwd(), 'release/customer-segments/customer-segments-2026-09-19-v1.json');
const release = customerSegmentReleaseSchema.parse(JSON.parse(fs.readFileSync(artifactPath, 'utf8')));
const db = new PrismaClient();

async function verifyPublished() {
  const rows = await db.contentItem.findMany({ where: { type: 'CUSTOMER_SEGMENT', slug: { in: release.entries.map((entry) => entry.slug) } }, select: { slug: true, publishedRevision: { select: { id: true, version: true, contentJson: true } } } });
  return release.entries.map((entry) => { const row = rows.find((item) => item.slug === entry.slug); const hash = row?.publishedRevision ? customerSegmentContentHash(JSON.parse(row.publishedRevision.contentJson)) : null; return { slug: entry.slug, expectedHash: entry.sourceHash, publishedHash: hash, matches: hash === entry.sourceHash, revisionId: row?.publishedRevision?.id ?? null, version: row?.publishedRevision?.version ?? null }; });
}

async function applyRelease() {
  assertDatabaseEnvironmentSafe(environment);
  if (environment.APP_ENV !== 'production' || environment.DATABASE_ENVIRONMENT !== 'production') throw new Error('Customer Segment promotion is Production-only.');
  if (process.env.CUSTOMER_SEGMENT_RELEASE_CONFIRM !== release.releaseId) throw new Error(`Set CUSTOMER_SEGMENT_RELEASE_CONFIRM=${release.releaseId} to apply this exact release.`);
  const authorEmail = process.env.CUSTOMER_SEGMENT_PROMOTION_AUTHOR_EMAIL?.trim().toLowerCase();
  const reviewerEmail = process.env.CUSTOMER_SEGMENT_PROMOTION_REVIEWER_EMAIL?.trim().toLowerCase();
  if (!authorEmail || !reviewerEmail || authorEmail === reviewerEmail) throw new Error('Distinct promotion author and reviewer emails are required.');
  const migration = await db.$queryRaw<Array<{ finished_at: Date | null; rolled_back_at: Date | null }>>`SELECT finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name = '20260919090000_add_customer_segment'`;
  if (!migration[0]?.finished_at || migration[0].rolled_back_at) throw new Error('Customer Segment migration is not successfully applied.');
  const [author, reviewer] = await Promise.all([db.user.findUnique({ where: { email: authorEmail } }), db.user.findUnique({ where: { email: reviewerEmail } })]);
  if (!author?.isActive || author.role !== 'ADMIN') throw new Error('Promotion author must be an active Production ADMIN.');
  if (!reviewer?.isActive || !['REVIEWER', 'ADMIN'].includes(reviewer.role)) throw new Error('Promotion reviewer must be an active Production REVIEWER or ADMIN.');
  const assignedSlugs = release.entries.flatMap((entry) => entry.content.journeys);
  if (new Set(assignedSlugs).size !== assignedSlugs.length) throw new Error('A Journey is assigned to more than one segment in the release.');
  const journeys = await db.contentItem.findMany({ where: { type: 'BANKING_JOURNEY', slug: { in: assignedSlugs }, isArchived: false, publishedRevisionId: { not: null } }, select: { slug: true } });
  if (journeys.length !== assignedSlugs.length) throw new Error('Release references a missing, archived, or unpublished Production Journey.');
  const otherSegments = await db.contentItem.findMany({ where: { type: 'CUSTOMER_SEGMENT', slug: { notIn: release.entries.map((entry) => entry.slug) }, isArchived: false, publishedRevisionId: { not: null } }, select: { slug: true, publishedRevision: { select: { contentJson: true } } } });
  const otherAssignments = new Set(otherSegments.flatMap((item) => { try { const value = JSON.parse(item.publishedRevision?.contentJson ?? '{}'); return Array.isArray(value.journeys) ? value.journeys.filter((slug: unknown): slug is string => typeof slug === 'string') : []; } catch { throw new Error(`Published Production Customer Segment ${item.slug} contains invalid JSON.`); } }));
  if (assignedSlugs.some((slug) => otherAssignments.has(slug))) throw new Error('A release Journey is already assigned to another published Production Customer Segment.');
  const current = await db.contentItem.findMany({ where: { type: 'CUSTOMER_SEGMENT', slug: { in: release.entries.map((entry) => entry.slug) } }, include: { publishedRevision: true, revisions: { where: { status: { in: ['DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED'] } }, select: { id: true, status: true } } } });
  if (current.some((item) => item.revisions.length)) throw new Error('Active Production Customer Segment revisions exist; promotion stopped without mutation.');
  const unchanged = new Set(current.filter((item) => item.publishedRevision && customerSegmentContentHash(JSON.parse(item.publishedRevision.contentJson)) === release.entries.find((entry) => entry.slug === item.slug)?.sourceHash).map((item) => item.slug));
  await db.$transaction(async (tx) => {
    for (const entry of release.entries) {
      if (unchanged.has(entry.slug)) continue;
      const contentJson = canonicalCustomerSegmentJson(entry.content);
      const existing = await tx.contentItem.findUnique({ where: { type_slug: { type: 'CUSTOMER_SEGMENT', slug: entry.slug } }, include: { _count: { select: { revisions: true } } } });
      let item = existing;
      if (!item) item = await tx.contentItem.create({ data: { type: 'CUSTOMER_SEGMENT', slug: entry.slug, stableKey: `customer-segment:${entry.slug}`, ownerId: author.id }, include: { _count: { select: { revisions: true } } } });
      if (item.isArchived) throw new Error(`Production Customer Segment ${entry.slug} is archived.`);
      const now = new Date();
      const revision = await tx.contentRevision.create({ data: { contentItemId: item.id, version: item._count.revisions + 1, status: 'PUBLISHED', contentJson, schemaVersion: entry.content.schemaVersion, authorId: author.id, reviewerId: reviewer.id, submittedAt: now, reviewedAt: now, publishedAt: now, reviewNote: `Promoted exact Development-approved artifact ${release.releaseId}.` } });
      await tx.contentItem.update({ where: { id: item.id }, data: { ownerId: author.id, publishedRevisionId: revision.id, previewJson: JSON.stringify({ title: entry.content.en.title, summary: entry.content.en.description }) } });
      await tx.auditLog.create({ data: { actorId: reviewer.id, action: 'CUSTOMER_SEGMENT_RELEASE_PROMOTED', entityType: 'ContentItem', entityId: item.id, metadataJson: JSON.stringify({ environment: 'production', releaseId: release.releaseId, sourceEnvironment: entry.sourceEnvironment, sourceRevisionId: entry.sourceRevisionId, sourceVersion: entry.sourceVersion, sourcePublishedAt: entry.sourcePublishedAt, sourceHash: entry.sourceHash, productionRevisionId: revision.id, previousPublishedRevisionId: existing?.publishedRevisionId ?? null, createdContentItem: !existing }) } });
    }
  });
  const result = await verifyPublished();
  if (result.some((entry) => !entry.matches)) throw new Error('Published Production read-back hash mismatch.');
  return result;
}

async function rollbackRelease() {
  assertDatabaseEnvironmentSafe(environment);
  if (environment.APP_ENV !== 'production' || environment.DATABASE_ENVIRONMENT !== 'production') throw new Error('Customer Segment rollback is Production-only.');
  if (process.env.CUSTOMER_SEGMENT_ROLLBACK_CONFIRM !== release.releaseId) throw new Error(`Set CUSTOMER_SEGMENT_ROLLBACK_CONFIRM=${release.releaseId} to rollback this exact release.`);
  const actorEmail = process.env.CUSTOMER_SEGMENT_ROLLBACK_ACTOR_EMAIL?.trim().toLowerCase();
  const actor = actorEmail ? await db.user.findUnique({ where: { email: actorEmail } }) : null;
  if (!actor?.isActive || actor.role !== 'ADMIN') throw new Error('Rollback actor must be an active Production ADMIN.');
  const items = await db.contentItem.findMany({ where: { type: 'CUSTOMER_SEGMENT', slug: { in: release.entries.map((entry) => entry.slug) } }, include: { publishedRevision: true } });
  if (items.length !== release.entries.length) throw new Error('Not every release segment exists in Production; rollback stopped.');
  const logs = await db.auditLog.findMany({ where: { action: 'CUSTOMER_SEGMENT_RELEASE_PROMOTED', entityId: { in: items.map((item) => item.id) } }, orderBy: { createdAt: 'desc' } });
  const plans = items.map((item) => { const log = logs.find((value) => { try { return JSON.parse(value.metadataJson ?? '{}').releaseId === release.releaseId; } catch { return false; } }); if (!log) throw new Error(`Promotion audit not found for ${item.slug}.`); const metadata = JSON.parse(log.metadataJson ?? '{}') as { productionRevisionId?: string; previousPublishedRevisionId?: string | null }; if (!metadata.productionRevisionId || item.publishedRevisionId !== metadata.productionRevisionId) throw new Error(`Published pointer for ${item.slug} changed after this release; rollback stopped.`); return { item, metadata }; });
  await db.$transaction(async (tx) => {
    for (const plan of plans) {
      const previous = plan.metadata.previousPublishedRevisionId ? await tx.contentRevision.findFirst({ where: { id: plan.metadata.previousPublishedRevisionId, contentItemId: plan.item.id, status: 'PUBLISHED' } }) : null;
      if (plan.metadata.previousPublishedRevisionId && !previous) throw new Error(`Previous published revision is unavailable for ${plan.item.slug}.`);
      const previousContent = previous ? JSON.parse(previous.contentJson) as { en?: { title?: string; description?: string } } : null;
      await tx.contentItem.update({ where: { id: plan.item.id }, data: { publishedRevisionId: previous?.id ?? null, previewJson: previousContent?.en?.title && previousContent.en.description ? JSON.stringify({ title: previousContent.en.title, summary: previousContent.en.description }) : null } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'CUSTOMER_SEGMENT_RELEASE_ROLLED_BACK', entityType: 'ContentItem', entityId: plan.item.id, metadataJson: JSON.stringify({ environment: 'production', releaseId: release.releaseId, rolledBackRevisionId: plan.metadata.productionRevisionId, restoredRevisionId: previous?.id ?? null }) } });
    }
  });
  return items.map((item) => ({ slug: item.slug, rolledBack: true }));
}

try {
  console.log(JSON.stringify(mode === '--apply' ? await applyRelease() : mode === '--rollback' ? await rollbackRelease() : await verifyPublished(), null, 2));
} finally {
  await db.$disconnect();
}
