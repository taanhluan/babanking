import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { evaluateContentAccessForUser } from '@/server/access-control/knowledge-access-repository';
import { assertJourneyCmsWriteEnvironment } from '@/server/cms/journey-cms-environment';
import {
  assertContentReadBack,
  assertGovernedDraftEditable,
  assertGovernedDraftSubmittable,
  assertGovernedRevisionPublishable,
  assertGovernedRevisionReviewable,
  assertGovernedRolePermission,
  governedAuditMetadata,
  type GovernedContentActor,
} from '@/server/cms/governed-content-lifecycle';
import { parseBaDocumentContent, validateBaDocumentPrimaryJourney } from './ba-document-domain';

function preview(contentJson: string) {
  const content = parseBaDocumentContent(JSON.parse(contentJson));
  return JSON.stringify({ title: content.metadata.title, summary: content.metadata.summary, documentType: content.documentType });
}

async function audit(tx: Prisma.TransactionClient, actorId: string, action: string, entityType: string, entityId: string, metadata: Record<string, unknown>) {
  const environment = assertJourneyCmsWriteEnvironment();
  await tx.auditLog.create({ data: { actorId, action, entityType, entityId, metadataJson: governedAuditMetadata(environment.APP_ENV, metadata) } });
}

export async function createBaDocument(input: { slug: string; primaryJourneyContentItemId: string; contentJson: string }, actor: GovernedContentActor) {
  assertJourneyCmsWriteEnvironment();
  assertGovernedRolePermission(actor.role, 'EDIT', 'BA Document');
  const access = await evaluateContentAccessForUser(actor.id, input.primaryJourneyContentItemId, 'EDIT');
  if (!access?.allowed) throw new Error('BA Document Primary Journey permission denied.');
  const content = parseBaDocumentContent(JSON.parse(input.contentJson));
  return db.$transaction(async (tx) => {
    const primary = await tx.contentItem.findUnique({ where: { id: input.primaryJourneyContentItemId }, select: { type: true, slug: true } });
    validateBaDocumentPrimaryJourney({ contentType: 'BA_DOCUMENT', primaryJourneyContentItemId: input.primaryJourneyContentItemId, parentType: primary?.type });
    if (content.metadata.primaryJourneySlug !== primary?.slug) throw new Error('BA Document Primary Journey slug does not match its database relation.');
    const item = await tx.contentItem.create({ data: { type: 'BA_DOCUMENT', slug: input.slug, primaryJourneyContentItemId: input.primaryJourneyContentItemId, previewJson: preview(input.contentJson) } });
    const revision = await tx.contentRevision.create({ data: { contentItemId: item.id, version: 1, status: 'DRAFT', schemaVersion: content.schemaVersion, contentJson: input.contentJson, authorId: actor.id } });
    await audit(tx, actor.id, 'BA_DOCUMENT_CREATED', 'ContentItem', item.id, { contentItemId: item.id, revisionId: revision.id, primaryJourneyContentItemId: input.primaryJourneyContentItemId });
    return { item, revision };
  });
}

export async function createBaDocumentDraftFromPublished(contentItemId: string, actor: GovernedContentActor) {
  assertJourneyCmsWriteEnvironment();
  assertGovernedRolePermission(actor.role, 'EDIT', 'BA Document');
  return db.$transaction(async (tx) => {
    const item = await tx.contentItem.findUnique({ where: { id: contentItemId, type: 'BA_DOCUMENT' }, select: { publishedRevision: { select: { id: true, contentJson: true, schemaVersion: true } }, revisions: { where: { status: { in: ['DRAFT', 'CHANGES_REQUESTED', 'IN_REVIEW'] } }, select: { id: true } } } });
    if (!item?.publishedRevision) throw new Error('Published BA Document revision not found.');
    if (item.revisions.length) throw new Error('An active BA Document revision already exists.');
    parseBaDocumentContent(JSON.parse(item.publishedRevision.contentJson));
    const latest = await tx.contentRevision.findFirst({ where: { contentItemId }, orderBy: { version: 'desc' }, select: { version: true } });
    const revision = await tx.contentRevision.create({ data: { contentItemId, version: (latest?.version ?? 0) + 1, status: 'DRAFT', schemaVersion: item.publishedRevision.schemaVersion, contentJson: item.publishedRevision.contentJson, authorId: actor.id } });
    await audit(tx, actor.id, 'BA_DOCUMENT_DRAFT_CREATED', 'ContentRevision', revision.id, { contentItemId, revisionId: revision.id, sourceRevisionId: item.publishedRevision.id });
    return revision;
  });
}

export async function saveBaDocumentDraft(contentItemId: string, revisionId: string, contentJson: string, actor: GovernedContentActor) {
  assertJourneyCmsWriteEnvironment();
  const content = parseBaDocumentContent(JSON.parse(contentJson));
  return db.$transaction(async (tx) => {
    const revision = await tx.contentRevision.findFirst({ where: { id: revisionId, contentItemId, contentItem: { type: 'BA_DOCUMENT' } }, select: { id: true, status: true, authorId: true } });
    if (!revision) throw new Error('BA Document draft not found.');
    assertGovernedDraftEditable({ role: actor.role, actorId: actor.id, authorId: revision.authorId, status: revision.status }, 'BA Document');
    const saved = await tx.contentRevision.updateMany({ where: { id: revision.id, contentItemId, status: revision.status, authorId: revision.authorId }, data: { contentJson, schemaVersion: content.schemaVersion } });
    if (saved.count !== 1) throw new Error('BA Document save conflict.');
    const readBack = await tx.contentRevision.findUnique({ where: { id: revision.id }, select: { contentJson: true } });
    if (!readBack) throw new Error('BA Document save read-back failed.');
    assertContentReadBack(contentJson, readBack.contentJson, 'BA Document save');
    await audit(tx, actor.id, 'BA_DOCUMENT_DRAFT_UPDATED', 'ContentRevision', revision.id, { contentItemId, revisionId });
    return readBack;
  });
}

export async function submitBaDocumentRevision(contentItemId: string, revisionId: string, actor: GovernedContentActor) {
  return transitionRevision(contentItemId, revisionId, actor, 'submit');
}

export async function reviewBaDocumentRevision(contentItemId: string, revisionId: string, decision: 'changes' | 'reject', note: string, actor: GovernedContentActor) {
  if (note.trim().length < 10) throw new Error('A review note is required.');
  return transitionRevision(contentItemId, revisionId, actor, decision, note.trim());
}

async function transitionRevision(contentItemId: string, revisionId: string, actor: GovernedContentActor, transition: 'submit' | 'changes' | 'reject', note?: string) {
  assertJourneyCmsWriteEnvironment();
  return db.$transaction(async (tx) => {
    const revision = await tx.contentRevision.findFirst({ where: { id: revisionId, contentItemId, contentItem: { type: 'BA_DOCUMENT' } }, select: { id: true, status: true, authorId: true, contentJson: true } });
    if (!revision) throw new Error('BA Document revision not found.');
    if (transition === 'submit') assertGovernedDraftSubmittable({ role: actor.role, actorId: actor.id, authorId: revision.authorId, status: revision.status }, 'BA Document');
    else assertGovernedRevisionReviewable({ role: actor.role, actorId: actor.id, authorId: revision.authorId, status: revision.status }, 'BA Document');
    parseBaDocumentContent(JSON.parse(revision.contentJson));
    const status = transition === 'submit' ? 'IN_REVIEW' : transition === 'changes' ? 'CHANGES_REQUESTED' : 'REJECTED';
    const updated = await tx.contentRevision.update({ where: { id: revision.id }, data: transition === 'submit' ? { status, submittedAt: new Date(), reviewNote: null } : { status, reviewerId: actor.id, reviewedAt: new Date(), reviewNote: note } });
    await audit(tx, actor.id, transition === 'submit' ? 'BA_DOCUMENT_SUBMITTED_FOR_REVIEW' : transition === 'changes' ? 'BA_DOCUMENT_CHANGES_REQUESTED' : 'BA_DOCUMENT_REJECTED', 'ContentRevision', revision.id, { contentItemId, revisionId });
    return updated;
  });
}

export async function publishBaDocumentRevisionTransaction(tx: Prisma.TransactionClient, contentItemId: string, revisionId: string, actor: GovernedContentActor) {
  assertJourneyCmsWriteEnvironment();
  const revision = await tx.contentRevision.findFirst({ where: { id: revisionId, contentItemId, contentItem: { type: 'BA_DOCUMENT' } }, select: { id: true, status: true, authorId: true, contentJson: true } });
  if (!revision) throw new Error('BA Document revision not found.');
  assertGovernedRevisionPublishable({ role: actor.role, actorId: actor.id, authorId: revision.authorId, status: revision.status }, 'BA Document');
  parseBaDocumentContent(JSON.parse(revision.contentJson));
  const item = await tx.contentItem.findUnique({ where: { id: contentItemId, type: 'BA_DOCUMENT' }, select: { publishedRevisionId: true } });
  if (!item) throw new Error('BA Document not found.');
  const now = new Date();
  const published = await tx.contentRevision.updateMany({ where: { id: revisionId, contentItemId, status: 'IN_REVIEW' }, data: { status: 'PUBLISHED', reviewerId: actor.id, reviewedAt: now, publishedAt: now } });
  if (published.count !== 1) throw new Error('BA Document revision publication conflict.');
  const pointed = await tx.contentItem.updateMany({ where: { id: contentItemId, publishedRevisionId: item.publishedRevisionId }, data: { publishedRevisionId: revisionId, previewJson: preview(revision.contentJson) } });
  if (pointed.count !== 1) throw new Error('BA Document publication pointer conflict.');
  const readBack = await tx.contentItem.findUnique({ where: { id: contentItemId }, select: { publishedRevision: { select: { contentJson: true } } } });
  if (!readBack?.publishedRevision) throw new Error('BA Document publication read-back failed.');
  assertContentReadBack(revision.contentJson, readBack.publishedRevision.contentJson, 'BA Document publication');
  await audit(tx, actor.id, 'BA_DOCUMENT_PUBLISHED', 'ContentItem', contentItemId, { contentItemId, revisionId, previousRevisionId: item.publishedRevisionId, newRevisionId: revisionId });
}

export function publishBaDocumentRevision(contentItemId: string, revisionId: string, actor: GovernedContentActor) {
  assertJourneyCmsWriteEnvironment();
  return db.$transaction((tx) => publishBaDocumentRevisionTransaction(tx, contentItemId, revisionId, actor));
}

export async function rollbackBaDocumentRevision(contentItemId: string, revisionId: string, actor: GovernedContentActor) {
  assertJourneyCmsWriteEnvironment();
  assertGovernedRolePermission(actor.role, 'MANAGE', 'BA Document');
  return db.$transaction(async (tx) => {
    const target = await tx.contentRevision.findFirst({ where: { id: revisionId, contentItemId, status: 'PUBLISHED', contentItem: { type: 'BA_DOCUMENT' } }, select: { id: true, contentJson: true } });
    if (!target) throw new Error('Published BA Document revision not found.');
    parseBaDocumentContent(JSON.parse(target.contentJson));
    const item = await tx.contentItem.findUnique({ where: { id: contentItemId, type: 'BA_DOCUMENT' }, select: { publishedRevisionId: true } });
    if (!item || item.publishedRevisionId === target.id) throw new Error('BA Document revision is already published.');
    const changed = await tx.contentItem.updateMany({ where: { id: contentItemId, publishedRevisionId: item.publishedRevisionId }, data: { publishedRevisionId: target.id, previewJson: preview(target.contentJson) } });
    if (changed.count !== 1) throw new Error('BA Document rollback pointer conflict.');
    await audit(tx, actor.id, 'BA_DOCUMENT_ROLLED_BACK', 'ContentItem', contentItemId, { contentItemId, previousRevisionId: item.publishedRevisionId, newRevisionId: target.id });
  });
}

export async function setBaDocumentArchived(contentItemId: string, archived: boolean, actor: GovernedContentActor) {
  assertJourneyCmsWriteEnvironment();
  assertGovernedRolePermission(actor.role, 'MANAGE', 'BA Document');
  return db.$transaction(async (tx) => {
    const item = await tx.contentItem.findUnique({ where: { id: contentItemId, type: 'BA_DOCUMENT' }, select: { id: true, isArchived: true } });
    if (!item) throw new Error('BA Document not found.');
    const updated = await tx.contentItem.update({ where: { id: item.id }, data: { isArchived: archived } });
    await audit(tx, actor.id, archived ? 'BA_DOCUMENT_ARCHIVED' : 'BA_DOCUMENT_RESTORED', 'ContentItem', item.id, { contentItemId, previousArchived: item.isArchived, archived });
    return updated;
  });
}
