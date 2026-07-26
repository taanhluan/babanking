import 'server-only';
import type { Prisma, Role } from '@prisma/client';
import { db } from '@/lib/db';
import { assertJourneyCmsDevelopmentEnvironment } from './journey-cms-environment';
import {
  assertJourneyStableSlug,
  canonicalizeJourneyDraft,
  journeyPreviewJson,
  parseJourneyContentJson,
} from './journey-content-schema';
import {
  assertDraftEditable,
  assertDraftSubmittable,
  assertRevisionPublishable,
  assertRevisionReviewable,
  assertRolePermission,
} from './journey-cms-policy';

type Actor = { id: string; role: Role };

function auditMetadata(value: Record<string, unknown>) {
  return JSON.stringify({
    environment: 'development',
    ...value,
  });
}

export async function createJourneyDraftFromPublished(contentItemId: string, actor: Actor) {
  assertJourneyCmsDevelopmentEnvironment();
  assertRolePermission(actor.role, 'EDIT');
  return db.$transaction(async (transaction) => {
    const item = await transaction.contentItem.findUnique({
      where: { id: contentItemId, type: 'BANKING_JOURNEY' },
      select: {
        id: true,
        slug: true,
        publishedRevision: { select: { id: true, contentJson: true } },
        revisions: {
          where: { status: { in: ['DRAFT', 'CHANGES_REQUESTED', 'IN_REVIEW'] } },
          select: { id: true },
        },
      },
    });
    if (!item?.publishedRevision) throw new Error('Published Journey revision not found.');
    if (item.revisions.length) throw new Error('An active Journey revision already exists.');
    const content = parseJourneyContentJson(item.publishedRevision.contentJson);
    assertJourneyStableSlug(content, item.slug);
    const latest = await transaction.contentRevision.findFirst({
      where: { contentItemId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const revision = await transaction.contentRevision.create({
      data: {
        contentItemId,
        version: (latest?.version ?? 0) + 1,
        status: 'DRAFT',
        schemaVersion: 1,
        contentJson: item.publishedRevision.contentJson,
        authorId: actor.id,
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'JOURNEY_DRAFT_CREATED',
        entityType: 'ContentRevision',
        entityId: revision.id,
        metadataJson: auditMetadata({
          contentItemId,
          revisionId: revision.id,
          sourceRevisionId: item.publishedRevision.id,
        }),
      },
    });
    return revision;
  });
}

export async function saveJourneyDraft(
  contentItemId: string,
  revisionId: string,
  title: string,
  summary: string,
  contentJson: string,
  actor: Actor,
) {
  assertJourneyCmsDevelopmentEnvironment();
  return db.$transaction(async (transaction) => {
    const revision = await transaction.contentRevision.findFirst({
      where: { id: revisionId, contentItemId },
      select: {
        id: true,
        status: true,
        authorId: true,
        contentJson: true,
        contentItem: { select: { slug: true } },
      },
    });
    if (!revision) throw new Error('Journey draft not found.');
    assertDraftEditable({ role: actor.role, actorId: actor.id, authorId: revision.authorId, status: revision.status });
    const content = canonicalizeJourneyDraft({
      authoritativeJson: revision.contentJson,
      submittedJson: contentJson,
      title,
      summary,
      stableSlug: revision.contentItem.slug,
    });
    const updated = await transaction.contentRevision.update({
      where: { id: revision.id },
      data: { contentJson: JSON.stringify(content), schemaVersion: content.schemaVersion },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'JOURNEY_DRAFT_UPDATED',
        entityType: 'ContentRevision',
        entityId: revision.id,
        metadataJson: auditMetadata({ contentItemId, revisionId: revision.id }),
      },
    });
    return updated;
  });
}

export async function submitJourneyRevision(
  contentItemId: string,
  revisionId: string,
  actor: Actor,
) {
  assertJourneyCmsDevelopmentEnvironment();
  return db.$transaction(async (transaction) => {
    const revision = await transaction.contentRevision.findFirst({
      where: { id: revisionId, contentItemId },
      select: { id: true, status: true, authorId: true, contentJson: true },
    });
    if (!revision) throw new Error('Journey draft not found.');
    assertDraftSubmittable({ role: actor.role, actorId: actor.id, authorId: revision.authorId, status: revision.status });
    parseJourneyContentJson(revision.contentJson);
    const updated = await transaction.contentRevision.update({
      where: { id: revision.id },
      data: { status: 'IN_REVIEW', submittedAt: new Date(), reviewNote: null },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'JOURNEY_SUBMITTED_FOR_REVIEW',
        entityType: 'ContentRevision',
        entityId: revision.id,
        metadataJson: auditMetadata({ contentItemId, revisionId: revision.id }),
      },
    });
    return updated;
  });
}

export async function reviewJourneyRevision(
  contentItemId: string,
  revisionId: string,
  decision: 'changes' | 'reject',
  note: string,
  actor: Actor,
) {
  assertJourneyCmsDevelopmentEnvironment();
  if (note.trim().length < 10) throw new Error('A review note is required.');
  return db.$transaction(async (transaction) => {
    const revision = await transaction.contentRevision.findFirst({
      where: { id: revisionId, contentItemId },
      select: { id: true, status: true, authorId: true },
    });
    if (!revision) throw new Error('Journey revision not found.');
    assertRevisionReviewable({ role: actor.role, actorId: actor.id, authorId: revision.authorId, status: revision.status });
    const status = decision === 'changes' ? 'CHANGES_REQUESTED' : 'REJECTED';
    const updated = await transaction.contentRevision.update({
      where: { id: revision.id },
      data: {
        status,
        reviewerId: actor.id,
        reviewedAt: new Date(),
        reviewNote: note.trim(),
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: decision === 'changes' ? 'JOURNEY_CHANGES_REQUESTED' : 'JOURNEY_REJECTED',
        entityType: 'ContentRevision',
        entityId: revision.id,
        metadataJson: auditMetadata({ contentItemId, revisionId: revision.id }),
      },
    });
    return updated;
  });
}

export async function publishJourneyRevisionTransaction(
  transaction: Prisma.TransactionClient,
  contentItemId: string,
  revisionId: string,
  actor: Actor,
) {
  assertJourneyCmsDevelopmentEnvironment();
  const revision = await transaction.contentRevision.findFirst({
    where: { id: revisionId, contentItemId },
    select: { id: true, status: true, authorId: true, contentJson: true },
  });
  if (!revision) throw new Error('Journey revision not found.');
  assertRevisionPublishable({ role: actor.role, actorId: actor.id, authorId: revision.authorId, status: revision.status });
  const content = parseJourneyContentJson(revision.contentJson);
  const item = await transaction.contentItem.findUnique({
    where: { id: contentItemId, type: 'BANKING_JOURNEY' },
    select: { publishedRevisionId: true, slug: true },
  });
  if (!item) throw new Error('Journey not found.');
  assertJourneyStableSlug(content, item.slug);
  const now = new Date();
  const published = await transaction.contentRevision.updateMany({
    where: { id: revision.id, contentItemId, status: 'IN_REVIEW' },
    data: {
      status: 'PUBLISHED',
      reviewerId: actor.id,
      reviewedAt: now,
      publishedAt: now,
    },
  });
  if (published.count !== 1) throw new Error('Journey revision publication conflict.');
  const pointed = await transaction.contentItem.updateMany({
    where: { id: contentItemId, publishedRevisionId: item.publishedRevisionId },
    data: {
      publishedRevisionId: revision.id,
      previewJson: journeyPreviewJson(content),
    },
  });
  if (pointed.count !== 1) throw new Error('Journey publication pointer conflict.');
  await transaction.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'JOURNEY_PUBLISHED',
      entityType: 'ContentItem',
      entityId: contentItemId,
      metadataJson: auditMetadata({
        contentItemId,
        revisionId: revision.id,
        previousRevisionId: item.publishedRevisionId,
        newRevisionId: revision.id,
      }),
    },
  });
}

export async function publishJourneyRevision(
  contentItemId: string,
  revisionId: string,
  actor: Actor,
) {
  assertJourneyCmsDevelopmentEnvironment();
  return db.$transaction((transaction) =>
    publishJourneyRevisionTransaction(transaction, contentItemId, revisionId, actor));
}

export async function rollbackJourneyRevisionTransaction(
  transaction: Prisma.TransactionClient,
  contentItemId: string,
  revisionId: string,
  actor: Actor,
) {
  assertJourneyCmsDevelopmentEnvironment();
  assertRolePermission(actor.role, 'MANAGE');
  const target = await transaction.contentRevision.findFirst({
    where: { id: revisionId, contentItemId, status: 'PUBLISHED' },
    select: { id: true, contentJson: true },
  });
  if (!target) throw new Error('Published Journey revision not found.');
  const content = parseJourneyContentJson(target.contentJson);
  const item = await transaction.contentItem.findUnique({
    where: { id: contentItemId, type: 'BANKING_JOURNEY' },
    select: { publishedRevisionId: true, slug: true },
  });
  if (!item || item.publishedRevisionId === target.id) {
    throw new Error('Journey revision is already published.');
  }
  assertJourneyStableSlug(content, item.slug);
  const rolledBack = await transaction.contentItem.updateMany({
    where: { id: contentItemId, publishedRevisionId: item.publishedRevisionId },
    data: {
      publishedRevisionId: target.id,
      previewJson: journeyPreviewJson(content),
    },
  });
  if (rolledBack.count !== 1) throw new Error('Journey rollback pointer conflict.');
  await transaction.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'JOURNEY_ROLLED_BACK',
      entityType: 'ContentItem',
      entityId: contentItemId,
      metadataJson: auditMetadata({
        contentItemId,
        previousRevisionId: item.publishedRevisionId,
        newRevisionId: target.id,
      }),
    },
  });
}

export async function rollbackJourneyRevision(
  contentItemId: string,
  revisionId: string,
  actor: Actor,
) {
  assertJourneyCmsDevelopmentEnvironment();
  return db.$transaction((transaction) =>
    rollbackJourneyRevisionTransaction(transaction, contentItemId, revisionId, actor));
}

export async function setJourneyArchived(
  contentItemId: string,
  archived: boolean,
  actor: Actor,
) {
  assertJourneyCmsDevelopmentEnvironment();
  assertRolePermission(actor.role, 'MANAGE');
  return db.$transaction(async (transaction) => {
    const item = await transaction.contentItem.findUnique({
      where: { id: contentItemId, type: 'BANKING_JOURNEY' },
      select: { id: true, isArchived: true },
    });
    if (!item) throw new Error('Journey not found.');
    const updated = await transaction.contentItem.update({
      where: { id: item.id },
      data: { isArchived: archived },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: archived ? 'JOURNEY_ARCHIVED' : 'JOURNEY_RESTORED',
        entityType: 'ContentItem',
        entityId: item.id,
        metadataJson: auditMetadata({ contentItemId, previousArchived: item.isArchived, archived }),
      },
    });
    return updated;
  });
}
