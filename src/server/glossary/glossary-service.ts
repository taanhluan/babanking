import 'server-only';
import { db } from '@/lib/db';
import { getServerEnvironment } from '@/server/env';
import { assertContentActionAccess, assertScopeActionAccess } from '@/server/access-control/require-knowledge-access';
import { isJourneyCmsWriteAllowed } from '@/server/cms/journey-cms-environment-core';
import {
  assertContentReadBack, assertGovernedDraftEditable, assertGovernedDraftSubmittable, assertGovernedRevisionPublishable,
  assertGovernedRevisionReviewable, assertGovernedRolePermission, governedAuditMetadata, type GovernedContentActor,
} from '@/server/cms/governed-content-lifecycle';
import {
  glossaryEntryContentSchema, glossaryEntryLinkedSlugs, glossaryInitialContent, glossaryPreviewJson, glossarySelfReferences,
  glossarySlugPattern, parseGlossaryEntryContent, type GlossaryEntryContent, type GlossaryKind,
} from './glossary-domain';

/** Shared Knowledge Scope that every glossary entry is mapped to; packages grant it like any other scope. */
export const GLOSSARY_SCOPE_CODE = 'BANKING_GLOSSARY';
const label = 'Glossary entry';

function writeEnvironment() {
  const environment = getServerEnvironment();
  if (!isJourneyCmsWriteAllowed(environment)) throw new Error('Glossary CMS writes are unavailable in this environment.');
  return environment.APP_ENV;
}

function audit(action: string, entityType: 'ContentItem' | 'ContentRevision', entityId: string, actorId: string, environment: string, metadata: Record<string, unknown> = {}) {
  return { data: { actorId, action, entityType, entityId, metadataJson: governedAuditMetadata(environment, metadata) } };
}

async function loadRevision(contentItemId: string, revisionId: string) {
  const revision = await db.contentRevision.findFirst({ where: { id: revisionId, contentItemId, contentItem: { type: 'GLOSSARY_ENTRY' } }, include: { contentItem: { select: { slug: true, publishedRevisionId: true } } } });
  if (!revision) throw new Error('Glossary revision not found.');
  return revision;
}

function parseForSave(value: unknown, slug: string) {
  const content = glossaryEntryContentSchema.parse(value);
  if (glossarySelfReferences(content, slug).length) throw new Error('A glossary entry cannot link to itself.');
  return content;
}

/**
 * Publish gate: no placeholders; linked glossary entries must exist and not be archived (they may still be
 * drafts, so reciprocal links can be published in any order; readers only see published, authorized links);
 * linked Journeys must be published.
 */
export async function assertGlossaryPublishReady(content: GlossaryEntryContent, slug: string) {
  if (glossarySelfReferences(content, slug).length) throw new Error('A glossary entry cannot link to itself.');
  const initial = glossaryInitialContent(content.kind, content.en.name);
  if (content.en.shortDefinition === initial.en.shortDefinition) throw new Error('Replace the placeholder definitions before publishing.');
  if (content.regulation && [content.regulation.issuer, content.regulation.documentNumber].includes('TBD')) throw new Error('Replace the placeholder regulation details before publishing.');
  const entrySlugs = glossaryEntryLinkedSlugs(content);
  const [entries, journeys] = await Promise.all([
    entrySlugs.length ? db.contentItem.findMany({ where: { type: 'GLOSSARY_ENTRY', slug: { in: entrySlugs }, isArchived: false }, select: { slug: true } }) : [],
    content.relatedJourneySlugs.length ? db.contentItem.findMany({ where: { type: 'BANKING_JOURNEY', slug: { in: content.relatedJourneySlugs }, isArchived: false, publishedRevisionId: { not: null } }, select: { slug: true } }) : [],
  ]);
  const missingEntries = entrySlugs.filter((value) => !entries.some((entry) => entry.slug === value));
  const missingJourneys = content.relatedJourneySlugs.filter((value) => !journeys.some((journey) => journey.slug === value));
  if (missingEntries.length || missingJourneys.length) {
    throw new Error(`Linked content is unavailable: ${[...missingEntries.map((value) => `entry ${value} (missing or archived)`), ...missingJourneys.map((value) => `journey ${value} (not published)`)].join(', ')}.`);
  }
}

export async function createGlossaryEntry(input: { slug: string; kind: GlossaryKind; name: string }, actor: GovernedContentActor) {
  const environment = writeEnvironment();
  assertGovernedRolePermission(actor.role, 'EDIT', label);
  if (!glossarySlugPattern.test(input.slug) || input.slug.length > 120) throw new Error('Use a lowercase, hyphenated slug.');
  const scope = await db.knowledgeScope.findFirst({ where: { code: GLOSSARY_SCOPE_CODE, isActive: true }, select: { id: true } });
  if (!scope) throw new Error(`Knowledge scope "${GLOSSARY_SCOPE_CODE}" is not configured.`);
  await assertScopeActionAccess(actor.id, scope.id, 'EDIT');
  const content = glossaryEntryContentSchema.parse(glossaryInitialContent(input.kind, input.name.trim()));
  const contentJson = JSON.stringify(content);
  return db.$transaction(async (tx) => {
    if (await tx.contentItem.findUnique({ where: { type_slug: { type: 'GLOSSARY_ENTRY', slug: input.slug } }, select: { id: true } })) throw new Error('A glossary entry with this slug already exists.');
    const item = await tx.contentItem.create({
      data: {
        type: 'GLOSSARY_ENTRY', slug: input.slug, stableKey: `glossary:${input.slug}`, ownerId: actor.id, previewJson: glossaryPreviewJson(content),
        knowledgeScopes: { create: { knowledgeScopeId: scope.id, relationshipType: 'PRIMARY', isRequired: true } },
      },
    });
    const revision = await tx.contentRevision.create({ data: { contentItemId: item.id, version: 1, contentJson, authorId: actor.id } });
    assertContentReadBack(contentJson, revision.contentJson, 'Glossary create');
    await tx.auditLog.create(audit('GLOSSARY_ENTRY_CREATED', 'ContentItem', item.id, actor.id, environment, { slug: item.slug, revisionId: revision.id, knowledgeScopeId: scope.id }));
    return item;
  });
}

export async function createGlossaryDraft(contentItemId: string, actor: GovernedContentActor) {
  const environment = writeEnvironment();
  assertGovernedRolePermission(actor.role, 'EDIT', label);
  await assertContentActionAccess(actor.id, contentItemId, 'EDIT');
  const item = await db.contentItem.findFirst({ where: { id: contentItemId, type: 'GLOSSARY_ENTRY', isArchived: false }, include: { publishedRevision: true, revisions: { where: { status: { in: ['DRAFT', 'CHANGES_REQUESTED', 'IN_REVIEW'] } }, take: 1 }, _count: { select: { revisions: true } } } });
  if (!item?.publishedRevision) throw new Error('A published glossary entry is required to create a new draft.');
  if (item.revisions[0]) return item.revisions[0];
  return db.$transaction(async (tx) => {
    const revision = await tx.contentRevision.create({ data: { contentItemId, version: item._count.revisions + 1, contentJson: item.publishedRevision!.contentJson, authorId: actor.id } });
    await tx.auditLog.create(audit('GLOSSARY_ENTRY_DRAFT_CREATED', 'ContentRevision', revision.id, actor.id, environment, { contentItemId, sourceRevisionId: item.publishedRevisionId }));
    return revision;
  });
}

export async function saveGlossaryEntry(contentItemId: string, revisionId: string, value: unknown, actor: GovernedContentActor) {
  const environment = writeEnvironment();
  const revision = await loadRevision(contentItemId, revisionId);
  assertGovernedDraftEditable({ ...revision, actorId: actor.id, role: actor.role }, label);
  await assertContentActionAccess(actor.id, contentItemId, 'EDIT');
  const json = JSON.stringify(parseForSave(value, revision.contentItem.slug));
  await db.$transaction(async (tx) => {
    const updated = await tx.contentRevision.updateMany({ where: { id: revisionId, status: { in: ['DRAFT', 'CHANGES_REQUESTED'] } }, data: { contentJson: json } });
    if (updated.count !== 1) throw new Error('Glossary draft changed before it could be saved.');
    const stored = await tx.contentRevision.findUniqueOrThrow({ where: { id: revisionId }, select: { contentJson: true } });
    assertContentReadBack(json, stored.contentJson, 'Glossary save');
    await tx.auditLog.create(audit('GLOSSARY_ENTRY_DRAFT_UPDATED', 'ContentRevision', revisionId, actor.id, environment, { contentItemId }));
  });
}

export async function submitGlossaryEntry(contentItemId: string, revisionId: string, actor: GovernedContentActor) {
  const environment = writeEnvironment();
  const revision = await loadRevision(contentItemId, revisionId);
  assertGovernedDraftSubmittable({ ...revision, actorId: actor.id, role: actor.role }, label, true);
  await assertContentActionAccess(actor.id, contentItemId, 'EDIT');
  if (!parseGlossaryEntryContent(revision.contentJson)) throw new Error('Glossary content is invalid.');
  await db.$transaction(async (tx) => {
    const updated = await tx.contentRevision.updateMany({ where: { id: revisionId, status: { in: ['DRAFT', 'CHANGES_REQUESTED'] } }, data: { status: 'IN_REVIEW', submittedAt: new Date(), reviewNote: null } });
    if (updated.count !== 1) throw new Error('Glossary draft changed before it could be submitted.');
    await tx.auditLog.create(audit('GLOSSARY_ENTRY_SUBMITTED', 'ContentRevision', revisionId, actor.id, environment, { contentItemId }));
  });
}

export async function reviewGlossaryEntry(contentItemId: string, revisionId: string, decision: 'changes' | 'reject', note: string, actor: GovernedContentActor) {
  const environment = writeEnvironment();
  if (note.trim().length < 10) throw new Error('A review note is required.');
  const revision = await loadRevision(contentItemId, revisionId);
  assertGovernedRevisionReviewable({ ...revision, actorId: actor.id, role: actor.role }, label);
  await assertContentActionAccess(actor.id, contentItemId, 'REVIEW');
  await db.$transaction(async (tx) => {
    const updated = await tx.contentRevision.updateMany({ where: { id: revisionId, status: 'IN_REVIEW' }, data: { status: decision === 'changes' ? 'CHANGES_REQUESTED' : 'REJECTED', reviewerId: actor.id, reviewedAt: new Date(), reviewNote: note.trim() } });
    if (updated.count !== 1) throw new Error('Glossary revision changed before it could be reviewed.');
    await tx.auditLog.create(audit(decision === 'changes' ? 'GLOSSARY_ENTRY_CHANGES_REQUESTED' : 'GLOSSARY_ENTRY_REJECTED', 'ContentRevision', revisionId, actor.id, environment, { contentItemId }));
  });
}

export async function publishGlossaryEntry(contentItemId: string, revisionId: string, actor: GovernedContentActor) {
  const environment = writeEnvironment();
  const revision = await loadRevision(contentItemId, revisionId);
  assertGovernedRevisionPublishable({ ...revision, actorId: actor.id, role: actor.role }, label);
  await assertContentActionAccess(actor.id, contentItemId, 'PUBLISH');
  const content = parseGlossaryEntryContent(revision.contentJson);
  if (!content) throw new Error('Glossary content is invalid.');
  await assertGlossaryPublishReady(content, revision.contentItem.slug);
  const previousRevisionId = revision.contentItem.publishedRevisionId;
  await db.$transaction(async (tx) => {
    const now = new Date();
    const published = await tx.contentRevision.updateMany({ where: { id: revisionId, status: 'IN_REVIEW' }, data: { status: 'PUBLISHED', reviewerId: actor.id, reviewedAt: now, publishedAt: now } });
    if (published.count !== 1) throw new Error('Glossary revision changed before it could be published.');
    const pointer = await tx.contentItem.updateMany({ where: { id: contentItemId, publishedRevisionId: previousRevisionId }, data: { publishedRevisionId: revisionId, previewJson: glossaryPreviewJson(content) } });
    if (pointer.count !== 1) throw new Error('Glossary publication changed concurrently.');
    const stored = await tx.contentRevision.findUniqueOrThrow({ where: { id: revisionId }, select: { contentJson: true } });
    assertContentReadBack(revision.contentJson, stored.contentJson, 'Glossary publish');
    await tx.auditLog.create(audit('GLOSSARY_ENTRY_PUBLISHED', 'ContentItem', contentItemId, actor.id, environment, { revisionId, from: previousRevisionId ?? 'none', to: revisionId }));
  });
}

export async function rollbackGlossaryEntry(contentItemId: string, targetRevisionId: string, actor: GovernedContentActor) {
  const environment = writeEnvironment();
  assertGovernedRolePermission(actor.role, 'PUBLISH', label);
  await assertContentActionAccess(actor.id, contentItemId, 'PUBLISH');
  const target = await loadRevision(contentItemId, targetRevisionId);
  if (target.status !== 'PUBLISHED' || target.contentItem.publishedRevisionId === targetRevisionId) throw new Error('Only a previously published revision can be restored.');
  const content = parseGlossaryEntryContent(target.contentJson);
  if (!content) throw new Error('Glossary content is invalid.');
  const previousRevisionId = target.contentItem.publishedRevisionId;
  await db.$transaction(async (tx) => {
    const pointer = await tx.contentItem.updateMany({ where: { id: contentItemId, publishedRevisionId: previousRevisionId }, data: { publishedRevisionId: targetRevisionId, previewJson: glossaryPreviewJson(content) } });
    if (pointer.count !== 1) throw new Error('Glossary publication changed concurrently.');
    await tx.auditLog.create(audit('GLOSSARY_ENTRY_ROLLED_BACK', 'ContentItem', contentItemId, actor.id, environment, { from: previousRevisionId ?? 'none', to: targetRevisionId }));
  });
}

export async function setGlossaryEntryArchived(contentItemId: string, archived: boolean, actor: GovernedContentActor) {
  const environment = writeEnvironment();
  if (actor.role !== 'ADMIN') throw new Error('Only an administrator can archive glossary entries.');
  await db.$transaction(async (tx) => {
    const updated = await tx.contentItem.updateMany({ where: { id: contentItemId, type: 'GLOSSARY_ENTRY', isArchived: !archived }, data: { isArchived: archived } });
    if (updated.count !== 1) throw new Error('Glossary entry archive state changed concurrently.');
    await tx.auditLog.create(audit(archived ? 'GLOSSARY_ENTRY_ARCHIVED' : 'GLOSSARY_ENTRY_RESTORED', 'ContentItem', contentItemId, actor.id, environment, { archived }));
  });
}
