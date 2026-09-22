import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient, type Prisma } from '@prisma/client';
import { loadEnvironmentFiles } from './load-environment-files';
import { assertDatabaseEnvironmentSafe, parseServerEnvironment } from '../src/server/environment-core';
import { canonicalCustomerSegmentJson, customerSegmentContentHash } from '../src/server/customer-segment/customer-segment-release';
import { canonicalContentHash, canonicalJson, RETAIL_PRODUCTION_GUARD_HASH, SME_ENTERPRISE_RELEASE_ID, smeEnterpriseReleaseSchema } from '../src/server/customer-segment/sme-enterprise-release';

loadEnvironmentFiles();
const mode = process.argv[2];
if (!['--verify', '--apply', '--rollback'].includes(mode)) throw new Error('Use --verify, --apply, or --rollback.');
const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
const artifactPath = path.resolve(process.cwd(), `release/customer-segments/${SME_ENTERPRISE_RELEASE_ID}.json`);
const release = smeEnterpriseReleaseSchema.parse(JSON.parse(fs.readFileSync(artifactPath, 'utf8')));
const db = new PrismaClient();
const targetJourneySlugs = release.journeys.map((entry) => entry.slug);
const targetSegmentSlugs = release.segments.map((entry) => entry.slug);

async function retailState(client: Prisma.TransactionClient | PrismaClient) {
  const item = await client.contentItem.findUnique({ where: { type_slug: { type: 'CUSTOMER_SEGMENT', slug: 'retail-banking' } }, include: { publishedRevision: true } });
  if (!item?.publishedRevisionId || !item.publishedRevision) throw new Error('Retail Banking is not published in Production; release stopped.');
  const hash = customerSegmentContentHash(JSON.parse(item.publishedRevision.contentJson));
  if (hash !== RETAIL_PRODUCTION_GUARD_HASH) throw new Error(`Retail Banking guard mismatch: expected ${RETAIL_PRODUCTION_GUARD_HASH}, received ${hash}.`);
  return { itemId: item.id, revisionId: item.publishedRevisionId, hash };
}

async function verifyPublished() {
  const retail = await retailState(db);
  const [journeyRows, segmentRows] = await Promise.all([
    db.contentItem.findMany({ where: { type: 'BANKING_JOURNEY', slug: { in: targetJourneySlugs } }, include: { publishedRevision: true, knowledgeScopes: { include: { knowledgeScope: true } } } }),
    db.contentItem.findMany({ where: { type: 'CUSTOMER_SEGMENT', slug: { in: targetSegmentSlugs } }, include: { publishedRevision: true } }),
  ]);
  const journeys = release.journeys.map((entry) => {
    const row = journeyRows.find((candidate) => candidate.slug === entry.slug);
    const hash = row?.publishedRevision ? canonicalContentHash(JSON.parse(row.publishedRevision.contentJson)) : null;
    const scopes = row?.knowledgeScopes.map((mapping) => ({ code: mapping.knowledgeScope.code, required: mapping.isRequired, relationship: mapping.relationshipType })) ?? [];
    return { slug: entry.slug, expectedHash: entry.sourceHash, publishedHash: hash, matches: hash === entry.sourceHash && !row?.isArchived, scopeMatches: scopes.length === 1 && scopes[0].code === entry.scopeCode && scopes[0].required && scopes[0].relationship === 'PRIMARY', revisionId: row?.publishedRevisionId ?? null };
  });
  const segments = release.segments.map((entry) => {
    const row = segmentRows.find((candidate) => candidate.slug === entry.slug);
    const hash = row?.publishedRevision ? customerSegmentContentHash(JSON.parse(row.publishedRevision.contentJson)) : null;
    return { slug: entry.slug, expectedHash: entry.sourceHash, publishedHash: hash, matches: hash === entry.sourceHash && !row?.isArchived, revisionId: row?.publishedRevisionId ?? null };
  });
  return { releaseId: release.releaseId, retail: { ...retail, unchanged: true }, journeys, segments, allMatch: journeys.every((entry) => entry.matches && entry.scopeMatches) && segments.every((entry) => entry.matches) };
}

async function requireProductionActors() {
  assertDatabaseEnvironmentSafe(environment);
  if (environment.APP_ENV !== 'production' || environment.DATABASE_ENVIRONMENT !== 'production') throw new Error('SME/Enterprise promotion is Production-only.');
  if (process.env.SME_ENTERPRISE_RELEASE_CONFIRM !== release.releaseId) throw new Error(`Set SME_ENTERPRISE_RELEASE_CONFIRM=${release.releaseId}.`);
  const authorEmail = process.env.SME_ENTERPRISE_PROMOTION_AUTHOR_EMAIL?.trim().toLowerCase();
  const reviewerEmail = process.env.SME_ENTERPRISE_PROMOTION_REVIEWER_EMAIL?.trim().toLowerCase();
  if (!authorEmail || !reviewerEmail || authorEmail === reviewerEmail) throw new Error('Distinct Production author and reviewer emails are required.');
  const [author, reviewer] = await Promise.all([db.user.findUnique({ where: { email: authorEmail } }), db.user.findUnique({ where: { email: reviewerEmail } })]);
  if (!author?.isActive || author.role !== 'ADMIN') throw new Error('Promotion author must be an active Production ADMIN.');
  if (!reviewer?.isActive || !['REVIEWER', 'ADMIN'].includes(reviewer.role)) throw new Error('Promotion reviewer must be an active Production REVIEWER or ADMIN.');
  return { author, reviewer };
}

async function applyRelease() {
  const { author, reviewer } = await requireProductionActors();
  const migration = await db.$queryRaw<Array<{ finished_at: Date | null; rolled_back_at: Date | null }>>`SELECT finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name = '20260919090000_add_customer_segment'`;
  if (!migration[0]?.finished_at || migration[0].rolled_back_at) throw new Error('Customer Segment migration is not successfully applied.');
  const retailBefore = await retailState(db);
  const scopes = await db.knowledgeScope.findMany({ where: { code: { in: [...new Set(release.journeys.map((entry) => entry.scopeCode))] }, isActive: true } });
  if (scopes.length !== new Set(release.journeys.map((entry) => entry.scopeCode)).size) throw new Error('A required active Production Knowledge Scope is missing.');
  const scopeByCode = new Map(scopes.map((scope) => [scope.code, scope]));
  const otherSegments = await db.contentItem.findMany({ where: { type: 'CUSTOMER_SEGMENT', slug: { notIn: targetSegmentSlugs }, publishedRevisionId: { not: null }, isArchived: false }, include: { publishedRevision: true } });
  for (const item of otherSegments) {
    const assigned = JSON.parse(item.publishedRevision?.contentJson ?? '{}') as { journeys?: unknown };
    if (Array.isArray(assigned.journeys) && assigned.journeys.some((slug) => targetJourneySlugs.includes(String(slug)))) throw new Error(`Target Journey is already assigned to Customer Segment ${item.slug}.`);
  }

  await db.$transaction(async (tx) => {
    for (const entry of release.journeys) {
      const existing = await tx.contentItem.findUnique({ where: { type_slug: { type: 'BANKING_JOURNEY', slug: entry.slug } }, include: { publishedRevision: true, revisions: { orderBy: { version: 'desc' }, take: 1 }, knowledgeScopes: { include: { knowledgeScope: true } } } });
      if (existing?.isArchived) throw new Error(`Production Journey ${entry.slug} is archived.`);
      if (existing?.publishedRevision && canonicalContentHash(JSON.parse(existing.publishedRevision.contentJson)) === entry.sourceHash) continue;
      if (existing?.knowledgeScopes.length && !(existing.knowledgeScopes.length === 1 && existing.knowledgeScopes[0].knowledgeScope.code === entry.scopeCode && existing.knowledgeScopes[0].isRequired && existing.knowledgeScopes[0].relationshipType === 'PRIMARY')) throw new Error(`Production Journey ${entry.slug} has conflicting access scope mappings.`);
      const item = existing ?? await tx.contentItem.create({ data: { type: 'BANKING_JOURNEY', slug: entry.slug, stableKey: `banking-journey:${entry.slug}`, ownerId: author.id, accessMode: 'ANY_SCOPE' }, include: { publishedRevision: true, revisions: { orderBy: { version: 'desc' }, take: 1 }, knowledgeScopes: { include: { knowledgeScope: true } } } });
      if (!item.knowledgeScopes.length) await tx.contentKnowledgeScope.create({ data: { contentItemId: item.id, knowledgeScopeId: scopeByCode.get(entry.scopeCode)!.id, relationshipType: 'PRIMARY', isRequired: true } });
      const now = new Date();
      const revision = await tx.contentRevision.create({ data: { contentItemId: item.id, version: (item.revisions[0]?.version ?? 0) + 1, status: 'PUBLISHED', contentJson: canonicalJson(entry.content), schemaVersion: entry.content.schemaVersion, authorId: author.id, reviewerId: reviewer.id, submittedAt: now, reviewedAt: now, publishedAt: now, reviewNote: `Promoted exact Development-approved artifact ${release.releaseId}.` } });
      await tx.contentItem.update({ where: { id: item.id }, data: { ownerId: author.id, publishedRevisionId: revision.id, previewJson: JSON.stringify({ title: entry.content.title, summary: entry.content.summary, plannedSegment: entry.segment }) } });
      await tx.auditLog.create({ data: { actorId: reviewer.id, action: 'SME_ENTERPRISE_RELEASE_JOURNEY_PROMOTED', entityType: 'ContentItem', entityId: item.id, metadataJson: JSON.stringify({ releaseId: release.releaseId, environment: 'production', sourceRevisionId: entry.sourceRevisionId, sourceVersion: entry.sourceVersion, sourceHash: entry.sourceHash, productionRevisionId: revision.id, previousPublishedRevisionId: existing?.publishedRevisionId ?? null, createdContentItem: !existing }) } });
    }

    const publishedJourneys = await tx.contentItem.findMany({ where: { type: 'BANKING_JOURNEY', slug: { in: targetJourneySlugs }, isArchived: false, publishedRevisionId: { not: null } }, select: { slug: true } });
    if (publishedJourneys.length !== 20) throw new Error('Not all release Journeys are published; Segment promotion stopped.');
    for (const entry of release.segments) {
      const existing = await tx.contentItem.findUnique({ where: { type_slug: { type: 'CUSTOMER_SEGMENT', slug: entry.slug } }, include: { publishedRevision: true, revisions: { orderBy: { version: 'desc' }, take: 1 } } });
      if (existing?.isArchived) throw new Error(`Production Customer Segment ${entry.slug} is archived.`);
      if (existing?.publishedRevision && customerSegmentContentHash(JSON.parse(existing.publishedRevision.contentJson)) === entry.sourceHash) continue;
      const item = existing ?? await tx.contentItem.create({ data: { type: 'CUSTOMER_SEGMENT', slug: entry.slug, stableKey: `customer-segment:${entry.slug}`, ownerId: author.id }, include: { publishedRevision: true, revisions: { orderBy: { version: 'desc' }, take: 1 } } });
      const now = new Date();
      const revision = await tx.contentRevision.create({ data: { contentItemId: item.id, version: (item.revisions[0]?.version ?? 0) + 1, status: 'PUBLISHED', contentJson: canonicalCustomerSegmentJson(entry.content), schemaVersion: entry.content.schemaVersion, authorId: author.id, reviewerId: reviewer.id, submittedAt: now, reviewedAt: now, publishedAt: now, reviewNote: `Promoted exact Development-approved artifact ${release.releaseId}.` } });
      await tx.contentItem.update({ where: { id: item.id }, data: { ownerId: author.id, publishedRevisionId: revision.id, previewJson: JSON.stringify({ title: entry.content.en.title, summary: entry.content.en.description }) } });
      await tx.auditLog.create({ data: { actorId: reviewer.id, action: 'SME_ENTERPRISE_RELEASE_SEGMENT_PROMOTED', entityType: 'ContentItem', entityId: item.id, metadataJson: JSON.stringify({ releaseId: release.releaseId, environment: 'production', sourceRevisionId: entry.sourceRevisionId, sourceVersion: entry.sourceVersion, sourceHash: entry.sourceHash, productionRevisionId: revision.id, previousPublishedRevisionId: existing?.publishedRevisionId ?? null, createdContentItem: !existing }) } });
    }
    const retailAfter = await retailState(tx);
    if (retailAfter.revisionId !== retailBefore.revisionId || retailAfter.hash !== retailBefore.hash) throw new Error('Retail Banking changed during promotion; transaction rolled back.');
  }, { maxWait: 10_000, timeout: 120_000 });
  const result = await verifyPublished();
  if (!result.allMatch || result.retail.revisionId !== retailBefore.revisionId) throw new Error('Production read-back verification failed.');
  return result;
}

async function rollbackRelease() {
  assertDatabaseEnvironmentSafe(environment);
  if (environment.APP_ENV !== 'production' || environment.DATABASE_ENVIRONMENT !== 'production') throw new Error('SME/Enterprise rollback is Production-only.');
  if (process.env.SME_ENTERPRISE_ROLLBACK_CONFIRM !== release.releaseId) throw new Error(`Set SME_ENTERPRISE_ROLLBACK_CONFIRM=${release.releaseId}.`);
  const actorEmail = process.env.SME_ENTERPRISE_ROLLBACK_ACTOR_EMAIL?.trim().toLowerCase();
  const actor = actorEmail ? await db.user.findUnique({ where: { email: actorEmail } }) : null;
  if (!actor?.isActive || actor.role !== 'ADMIN') throw new Error('Rollback actor must be an active Production ADMIN.');
  const retailBefore = await retailState(db);
  const items = await db.contentItem.findMany({ where: { OR: [{ type: 'BANKING_JOURNEY', slug: { in: targetJourneySlugs } }, { type: 'CUSTOMER_SEGMENT', slug: { in: targetSegmentSlugs } }] } });
  if (items.length !== 22) throw new Error('Not all release items exist; rollback stopped.');
  const logs = await db.auditLog.findMany({ where: { action: { in: ['SME_ENTERPRISE_RELEASE_JOURNEY_PROMOTED', 'SME_ENTERPRISE_RELEASE_SEGMENT_PROMOTED'] }, entityId: { in: items.map((item) => item.id) } }, orderBy: { createdAt: 'desc' } });
  const plans = items.map((item) => {
    const log = logs.find((candidate) => { try { return JSON.parse(candidate.metadataJson ?? '{}').releaseId === release.releaseId; } catch { return false; } });
    if (!log) throw new Error(`Promotion audit missing for ${item.slug}.`);
    const metadata = JSON.parse(log.metadataJson ?? '{}') as { productionRevisionId?: string; previousPublishedRevisionId?: string | null };
    if (!metadata.productionRevisionId || item.publishedRevisionId !== metadata.productionRevisionId) throw new Error(`Published pointer for ${item.slug} changed after release; rollback stopped.`);
    return { item, metadata };
  });
  await db.$transaction(async (tx) => {
    for (const plan of plans) {
      const previous = plan.metadata.previousPublishedRevisionId ? await tx.contentRevision.findFirst({ where: { id: plan.metadata.previousPublishedRevisionId, contentItemId: plan.item.id, status: 'PUBLISHED' } }) : null;
      if (plan.metadata.previousPublishedRevisionId && !previous) throw new Error(`Previous published revision missing for ${plan.item.slug}.`);
      const parsed = previous ? JSON.parse(previous.contentJson) as { title?: string; summary?: string; en?: { title?: string; description?: string }; metadata?: { customerSegment?: string } } : null;
      const preview = parsed ? plan.item.type === 'CUSTOMER_SEGMENT' ? { title: parsed.en?.title, summary: parsed.en?.description } : { title: parsed.title, summary: parsed.summary, plannedSegment: parsed.metadata?.customerSegment } : null;
      await tx.contentItem.update({ where: { id: plan.item.id }, data: { publishedRevisionId: previous?.id ?? null, previewJson: preview ? JSON.stringify(preview) : null } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'SME_ENTERPRISE_RELEASE_ROLLED_BACK', entityType: 'ContentItem', entityId: plan.item.id, metadataJson: JSON.stringify({ releaseId: release.releaseId, rolledBackRevisionId: plan.metadata.productionRevisionId, restoredRevisionId: previous?.id ?? null }) } });
    }
    const retailAfter = await retailState(tx);
    if (retailAfter.revisionId !== retailBefore.revisionId) throw new Error('Retail Banking changed during rollback; transaction rolled back.');
  }, { maxWait: 10_000, timeout: 120_000 });
  return { releaseId: release.releaseId, rolledBack: plans.length, retailUnchanged: true };
}

try {
  console.log(JSON.stringify(mode === '--apply' ? await applyRelease() : mode === '--rollback' ? await rollbackRelease() : await verifyPublished(), null, 2));
} finally {
  await db.$disconnect();
}
