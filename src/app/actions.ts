'use server';
import { compare, hash } from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { clearSession, createSession, getCurrentUser, requireRole, safeCallback } from '@/lib/auth';
import { cookies } from 'next/headers';
import { canEditRevision, canReviewRevision } from '@/lib/permissions';
import { canTransition } from '@/lib/workflow';
import { requirePremiumAccess } from '@/lib/membership';
import { careerPreferenceSchema, contentDraftSchema, journeyBlockSchema, journeyMetadataSchema, journeyModuleSchema, journeySectionSchema, loginSchema, progressSchema, reservedSlugs } from '@/lib/validation';
import {
  assertContentActionAccess,
  assertScopeActionAccess,
} from '@/server/access-control/require-knowledge-access';
import { createDraftFromPublished } from '@/server/cms/revision-hierarchy';
import { publishRevision } from '@/server/cms/revision-service';
import { rollbackPublishedRevision } from '@/server/cms/revision-service';

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect('/login?error=invalid');
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user?.isActive || !(await compare(parsed.data.password, user.passwordHash))) redirect('/login?error=invalid');
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), preferredLocale: parsed.data.locale } }); await createSession(user.id);
  redirect(parsed.data.callbackUrl ? safeCallback(parsed.data.callbackUrl) : `/${parsed.data.locale}${user.role === 'ADMIN' ? '/admin' : '/workspace'}`);
}
export async function logoutAction() { await clearSession(); redirect('/'); }
export async function setLocaleAction(formData: FormData) {
  const locale = String(formData.get('locale'));
  if (locale !== 'en' && locale !== 'vi') throw new Error('Unsupported locale.');
  const target = safeCallback(String(formData.get('target') || `/${locale}`));
  (await cookies()).set('bba_locale', locale, { sameSite: 'lax', path: '/', maxAge: 31_536_000 });
  const user = await getCurrentUser();
  if (user) await db.user.update({ where: { id: user.id }, data: { preferredLocale: locale } });
  redirect(target);
}
export async function toggleBookmarkAction(formData: FormData) {
  const user = await requirePremiumAccess(), contentItemId = String(formData.get('contentItemId') || '');
  const existing = await db.bookmark.findUnique({ where: { userId_contentItemId: { userId: user.id, contentItemId } } });
  if (existing) await db.bookmark.delete({ where: { id: existing.id } }); else {
    await assertContentActionAccess(user.id, contentItemId, 'VIEW');
    await db.bookmark.create({ data: { userId: user.id, contentItemId } });
  }
  revalidatePath('/workspace/bookmarks');
}
export async function updateProgressAction(formData: FormData) {
  const user = await requirePremiumAccess(), parsed = progressSchema.parse(Object.fromEntries(formData));
  await assertContentActionAccess(user.id, parsed.contentItemId, 'VIEW');
  await db.readingActivity.upsert({ where: { userId_contentItemId: { userId: user.id, contentItemId: parsed.contentItemId } }, update: { progress: parsed.progress, completed: parsed.progress === 100, lastViewedAt: new Date() }, create: { userId: user.id, contentItemId: parsed.contentItemId, progress: parsed.progress, completed: parsed.progress === 100 } });
  revalidatePath('/workspace/history');
}
export async function saveCareerPreferenceAction(formData: FormData) {
  const user = await requirePremiumAccess(), parsed = careerPreferenceSchema.parse(Object.fromEntries(formData));
  const levels = await db.contentItem.findMany({ where: { type: 'CAREER_LEVEL', slug: { in: [parsed.currentLevelSlug, parsed.targetLevelSlug] } }, select: { id: true } });
  if (levels.length !== 2) throw new Error('Career level is not available.');
  await Promise.all(levels.map((level) => assertContentActionAccess(user.id, level.id, 'VIEW')));
  await db.userCareerPreference.upsert({ where: { userId: user.id }, update: parsed, create: { userId: user.id, ...parsed } }); revalidatePath('/workspace/roadmap');
}

export async function manageKnowledgeScopeGrantAction(formData: FormData) {
  const actor = await requireRole('ADMIN');
  const userId = String(formData.get('userId') || ''), knowledgeScopeId = String(formData.get('knowledgeScopeId') || '');
  const effect = String(formData.get('effect')) === 'DENY' ? 'DENY' : 'ALLOW';
  const permission = String(formData.get('permission')) as 'VIEW' | 'CREATE' | 'EDIT' | 'REVIEW' | 'PUBLISH' | 'MANAGE';
  const reason = String(formData.get('reason') || '').trim();
  const expiresValue = String(formData.get('expiresAt') || ''); const expiresAt = expiresValue ? new Date(expiresValue) : null;
  if (!userId || !knowledgeScopeId || !['VIEW','CREATE','EDIT','REVIEW','PUBLISH','MANAGE'].includes(permission) || (expiresAt && Number.isNaN(expiresAt.valueOf()))) throw new Error('Invalid knowledge grant.');
  const existing = await db.userScopeGrant.findFirst({ where: { userId, knowledgeScopeId, permission, effect, status: 'ACTIVE' } });
  const before = existing ? { status: existing.status, expiresAt: existing.expiresAt } : null;
  const grant = existing ? await db.userScopeGrant.update({ where: { id: existing.id }, data: { expiresAt, reason: reason || existing.reason } }) : await db.userScopeGrant.create({ data: { userId, knowledgeScopeId, permission, effect, expiresAt, reason: reason || 'Admin assignment', grantedById: actor.id } });
  await db.auditLog.create({ data: { actorId: actor.id, action: existing ? 'KNOWLEDGE_SCOPE_GRANT_UPDATED' : 'KNOWLEDGE_SCOPE_GRANTED', entityType: 'UserScopeGrant', entityId: grant.id, metadataJson: JSON.stringify({ targetUserId: userId, scopeId: knowledgeScopeId, permission, effect, before, after: { status: grant.status, expiresAt: grant.expiresAt } }) } });
  revalidatePath('/admin/access-control'); revalidatePath(`/admin/access-control/users/${userId}`);
}

export async function revokeKnowledgeScopeGrantAction(formData: FormData) {
  const actor = await requireRole('ADMIN'); const grantId = String(formData.get('grantId') || '');
  const grant = await db.userScopeGrant.findUnique({ where: { id: grantId } }); if (!grant) throw new Error('Grant not found.');
  await db.userScopeGrant.update({ where: { id: grantId }, data: { status: 'REVOKED', revokedAt: new Date(), revokedById: actor.id } });
  await db.auditLog.create({ data: { actorId: actor.id, action: 'KNOWLEDGE_SCOPE_REVOKED', entityType: 'UserScopeGrant', entityId: grantId, metadataJson: JSON.stringify({ targetUserId: grant.userId, scopeId: grant.knowledgeScopeId, permission: grant.permission, effect: grant.effect }) } });
  revalidatePath('/admin/access-control'); revalidatePath(`/admin/access-control/users/${grant.userId}`);
}

export async function assignKnowledgePackageAction(formData: FormData) {
  const actor = await requireRole('ADMIN'); const userId = String(formData.get('userId') || ''); const packageId = String(formData.get('packageId') || ''); const reason = String(formData.get('reason') || '').trim() || 'Admin package assignment';
  if (!userId || !packageId) throw new Error('User and package are required.');
  const existing = await db.userKnowledgePackageAssignment.findFirst({ where: { userId, packageId, status: 'ACTIVE' } });
  const assignment = existing ?? await db.userKnowledgePackageAssignment.create({ data: { userId, packageId, assignedById: actor.id, reason } });
  await db.auditLog.create({ data: { actorId: actor.id, action: existing ? 'KNOWLEDGE_PACKAGE_ALREADY_ASSIGNED' : 'KNOWLEDGE_PACKAGE_ASSIGNED', entityType: 'UserKnowledgePackageAssignment', entityId: assignment.id, metadataJson: JSON.stringify({ targetUserId: userId, packageId, reason }) } });
  revalidatePath('/admin/access-control'); revalidatePath(`/admin/access-control/users/${userId}`);
}
export async function createDraftAction(formData: FormData) {
  const user = await requireRole('CONTRIBUTOR'), parsed = contentDraftSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect('/contributor/content/new?error=validation');
  const scopeId = String(formData.get('knowledgeScopeId') || '');
  await assertScopeActionAccess(user.id, scopeId, 'CREATE');
  if (reservedSlugs.has(parsed.data.slug)) redirect('/contributor/content/new?error=slug');
  const existing = await db.contentItem.findUnique({ where: { type_slug: { type: parsed.data.type, slug: parsed.data.slug } } }); if (existing) redirect('/contributor/content/new?error=slug');
  const item = await db.contentItem.create({ data: { type: parsed.data.type, slug: parsed.data.slug, ownerId: user.id, knowledgeScopes: { create: { knowledgeScopeId: scopeId, relationshipType: 'PRIMARY', isRequired: true } } } });
  const content = { ...JSON.parse(parsed.data.contentJson), title: parsed.data.title, slug: parsed.data.slug, summary: parsed.data.summary };
  const revision = await db.contentRevision.create({ data: { contentItemId: item.id, version: 1, contentJson: JSON.stringify(content), authorId: user.id } });
  await db.auditLog.create({ data: { actorId: user.id, action: 'DRAFT_CREATED', entityType: 'ContentRevision', entityId: revision.id } });
  redirect(`/contributor/content/${item.id}/edit`);
}
export async function saveDraftAction(formData: FormData) {
  const user = await requireRole('CONTRIBUTOR'), revisionId = String(formData.get('revisionId')), contentJson = String(formData.get('contentJson') || '');
  const revision = await db.contentRevision.findUnique({ where: { id: revisionId } }); if (!revision || !canEditRevision(user.role, user.id, revision.authorId, revision.status)) throw new Error('Not authorized to edit this revision.');
  await assertContentActionAccess(user.id, revision.contentItemId, 'EDIT');
  JSON.parse(contentJson); await db.contentRevision.update({ where: { id: revision.id }, data: { contentJson } });
  await db.auditLog.create({ data: { actorId: user.id, action: 'DRAFT_UPDATED', entityType: 'ContentRevision', entityId: revision.id } }); revalidatePath(`/contributor/content/${revision.contentItemId}/edit`);
}
export async function submitRevisionAction(formData: FormData) {
  const user = await requireRole('CONTRIBUTOR'), revisionId = String(formData.get('revisionId'));
  const revision = await db.contentRevision.findUnique({ where: { id: revisionId } }); if (!revision || revision.authorId !== user.id || !canTransition(revision.status, 'SUBMIT')) throw new Error('Revision cannot be submitted.');
  await assertContentActionAccess(user.id, revision.contentItemId, 'EDIT');
  await db.contentRevision.update({ where: { id: revision.id }, data: { status: 'IN_REVIEW', submittedAt: new Date(), reviewNote: null } });
  await db.auditLog.create({ data: { actorId: user.id, action: 'REVISION_SUBMITTED', entityType: 'ContentRevision', entityId: revision.id } }); redirect('/contributor');
}
export async function reviewRevisionAction(formData: FormData) {
  const user = await requireRole('REVIEWER'), revisionId = String(formData.get('revisionId')), action = String(formData.get('action')), note = String(formData.get('reviewNote') || '').trim();
  const revision = await db.contentRevision.findUnique({ where: { id: revisionId }, include: { contentItem: true } }); if (!revision || !canReviewRevision(user.role, user.id, revision.authorId) || revision.status !== 'IN_REVIEW') throw new Error('Revision cannot be reviewed.');
  await assertContentActionAccess(user.id, revision.contentItemId, action === 'publish' ? 'PUBLISH' : 'REVIEW');
  if ((action === 'changes' || action === 'reject') && note.length < 10) throw new Error('A review note is required.');
  if (action === 'publish') await publishRevision(revision.id, user.id, note); else {
    const status = action === 'changes' ? 'CHANGES_REQUESTED' : 'REJECTED';
    await db.contentRevision.update({ where: { id: revision.id }, data: { status, reviewerId: user.id, reviewedAt: new Date(), reviewNote: note } });
    await db.auditLog.create({ data: { actorId: user.id, action: action === 'changes' ? 'CHANGES_REQUESTED' : 'REVISION_REJECTED', entityType: 'ContentRevision', entityId: revision.id } });
  }
  revalidatePath('/review'); revalidatePath('/search'); revalidatePath('/banking-journeys'); revalidatePath('/ba-practice'); revalidatePath('/case-studies'); revalidatePath('/career-roadmap'); redirect('/review');
}
export async function createDraftFromPublishedAction(formData: FormData) {
  const user = await requireRole('CONTRIBUTOR'), contentItemId = String(formData.get('contentItemId') || '');
  await assertContentActionAccess(user.id, contentItemId, 'EDIT');
  const draft = await createDraftFromPublished(contentItemId, user.id);
  await db.auditLog.create({ data: { actorId: user.id, action: 'DRAFT_CLONED_FROM_PUBLISHED', entityType: 'ContentRevision', entityId: draft.id, metadataJson: JSON.stringify({ contentItemId }) } });
  redirect(`/contributor/content/${contentItemId}/edit`);
}
export async function rollbackJourneyRevisionAction(formData: FormData) {
  const actor = await requireRole('ADMIN');
  const contentItemId = String(formData.get('contentItemId') || ''), revisionId = String(formData.get('revisionId') || '');
  await rollbackPublishedRevision(contentItemId, revisionId, actor.id);
  revalidatePath('/admin/content/journeys'); revalidatePath(`/admin/content/journeys/${contentItemId}`); revalidatePath('/search'); revalidatePath('/banking-journeys');
}
export async function createUserAction(formData: FormData) {
  const actor = await requireRole('ADMIN'), email = String(formData.get('email')).trim().toLowerCase(), name = String(formData.get('name')).trim(), password = String(formData.get('password')), role = String(formData.get('role'));
  if (!email.includes('@') || name.length < 2 || password.length < 12 || !['MEMBER','CONTRIBUTOR','REVIEWER','ADMIN'].includes(role)) throw new Error('Invalid user details.');
  const user = await db.user.create({ data: { email, name, passwordHash: await hash(password, 12), role: role as 'MEMBER' | 'CONTRIBUTOR' | 'REVIEWER' | 'ADMIN' } });
  await db.auditLog.create({ data: { actorId: actor.id, action: 'USER_CREATED', entityType: 'User', entityId: user.id, metadataJson: JSON.stringify({ role }) } }); revalidatePath('/admin/users');
}
export async function updateUserAction(formData: FormData) {
  const actor = await requireRole('ADMIN'), id = String(formData.get('userId')), role = String(formData.get('role')), isActive = formData.get('isActive') === 'true';
  if (id === actor.id && (!isActive || role !== 'ADMIN')) throw new Error('You cannot remove your own active admin access.');
  if (!isActive || role !== 'ADMIN') { const target = await db.user.findUnique({ where: { id } }); if (target?.role === 'ADMIN' && await db.user.count({ where: { role: 'ADMIN', isActive: true } }) <= 1) throw new Error('The last active admin cannot be changed.'); }
  await db.user.update({ where: { id }, data: { role: role as 'MEMBER' | 'CONTRIBUTOR' | 'REVIEWER' | 'ADMIN', isActive } });
  await db.auditLog.create({ data: { actorId: actor.id, action: 'USER_UPDATED', entityType: 'User', entityId: id, metadataJson: JSON.stringify({ role, isActive }) } }); revalidatePath('/admin/users');
}
export async function toggleArchiveAction(formData: FormData) {
  const actor = await requireRole('ADMIN'), id = String(formData.get('contentItemId'));
  const item = await db.contentItem.findUnique({ where: { id } }); if (!item) throw new Error('Content not found.');
  await db.contentItem.update({ where: { id }, data: { isArchived: !item.isArchived } });
  await db.auditLog.create({ data: { actorId: actor.id, action: item.isArchived ? 'CONTENT_RESTORED' : 'CONTENT_ARCHIVED', entityType: 'ContentItem', entityId: id } });
  revalidatePath('/admin/content'); revalidatePath('/search');
}

async function draftJourney(actorId: string, contentItemId: string) {
  const item = await db.contentItem.findUnique({ where: { id: contentItemId, type: 'BANKING_JOURNEY' }, select: { id: true, slug: true, publishedRevisionId: true, revisions: { where: { status: { in: ['DRAFT', 'CHANGES_REQUESTED'] } }, orderBy: { version: 'desc' }, take: 1, select: { id: true } } } });
  if (!item) throw new Error('Journey not found.');
  if (item.publishedRevisionId) throw new Error('Published Journeys are immutable. Create a new draft revision before editing.');
  if (!item.revisions[0]) throw new Error('A draft revision is required before editing the hierarchy.');
  return { ...item, draftRevisionId: item.revisions[0].id };
}

export async function createJourneyAction(formData: FormData) {
  const actor = await requireRole('ADMIN');
  const parsed = journeyMetadataSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || reservedSlugs.has(parsed.data.slug)) throw new Error('Invalid Journey metadata.');
  const existing = await db.contentItem.findUnique({ where: { type_slug: { type: 'BANKING_JOURNEY', slug: parsed.data.slug } } });
  if (existing) throw new Error('Journey slug already exists.');
  const scope = await db.knowledgeScope.findFirst({ where: { isActive: true, type: 'BANKING_DOMAIN' }, orderBy: { displayOrder: 'asc' } });
  if (!scope) throw new Error('A knowledge scope is required before creating a Journey.');
  const content = { title: parsed.data.title, slug: parsed.data.slug, summary: parsed.data.summary, description: parsed.data.description, category: parsed.data.category, journeyType: parsed.data.journeyType, tags: JSON.parse(parsed.data.tagsJson) };
  const item = await db.contentItem.create({ data: { type: 'BANKING_JOURNEY', slug: parsed.data.slug, stableKey: `BANKING_JOURNEY:${parsed.data.slug}`, ownerId: actor.id, description: parsed.data.description || null, category: parsed.data.category || null, journeyType: parsed.data.journeyType || null, tagsJson: parsed.data.tagsJson, displayOrder: parsed.data.displayOrder, seoTitle: parsed.data.seoTitle || null, seoDescription: parsed.data.seoDescription || null, heroImageMetadataJson: parsed.data.heroImageMetadataJson, knowledgeScopes: { create: { knowledgeScopeId: scope.id, relationshipType: 'PRIMARY', isRequired: true } }, revisions: { create: { version: 1, contentJson: JSON.stringify(content), authorId: actor.id } } } });
  await db.auditLog.create({ data: { actorId: actor.id, action: 'JOURNEY_CREATED', entityType: 'ContentItem', entityId: item.id } });
  revalidatePath('/admin/content/journeys');
  redirect(`/admin/content/journeys/${item.id}`);
}

export async function updateJourneyAction(formData: FormData) {
  const actor = await requireRole('ADMIN');
  const contentItemId = String(formData.get('contentItemId'));
  await draftJourney(actor.id, contentItemId);
  const parsed = journeyMetadataSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error('Invalid Journey metadata.');
  const slugOwner = await db.contentItem.findUnique({ where: { type_slug: { type: 'BANKING_JOURNEY', slug: parsed.data.slug } }, select: { id: true } });
  if (slugOwner && slugOwner.id !== contentItemId) throw new Error('Journey slug already exists.');
  const content = { title: parsed.data.title, slug: parsed.data.slug, summary: parsed.data.summary, description: parsed.data.description, category: parsed.data.category, journeyType: parsed.data.journeyType, tags: JSON.parse(parsed.data.tagsJson) };
  await db.$transaction(async (tx) => {
    const item = await tx.contentItem.findUniqueOrThrow({ where: { id: contentItemId }, select: { slug: true } });
    await tx.contentItem.update({ where: { id: contentItemId }, data: { slug: parsed.data.slug, description: parsed.data.description || null, category: parsed.data.category || null, journeyType: parsed.data.journeyType || null, tagsJson: parsed.data.tagsJson, displayOrder: parsed.data.displayOrder, seoTitle: parsed.data.seoTitle || null, seoDescription: parsed.data.seoDescription || null, heroImageMetadataJson: parsed.data.heroImageMetadataJson } });
    const revision = await tx.contentRevision.findFirst({ where: { contentItemId, status: { in: ['DRAFT', 'CHANGES_REQUESTED'] } }, orderBy: { version: 'desc' } });
    if (revision) await tx.contentRevision.update({ where: { id: revision.id }, data: { contentJson: JSON.stringify(content) } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: 'JOURNEY_UPDATED', entityType: 'ContentItem', entityId: contentItemId, metadataJson: JSON.stringify({ previousSlug: item.slug }) } });
  });
  revalidatePath(`/admin/content/journeys/${contentItemId}`); revalidatePath('/admin/content/journeys');
}

export async function archiveJourneyAction(formData: FormData) {
  const actor = await requireRole('ADMIN'); const id = String(formData.get('contentItemId')); await db.contentItem.update({ where: { id, type: 'BANKING_JOURNEY' }, data: { isArchived: formData.get('archived') === 'true' } });
  await db.auditLog.create({ data: { actorId: actor.id, action: formData.get('archived') === 'true' ? 'JOURNEY_ARCHIVED' : 'JOURNEY_RESTORED', entityType: 'ContentItem', entityId: id } });
  revalidatePath('/admin/content/journeys');
}

export async function saveJourneyModuleAction(formData: FormData) {
  const actor = await requireRole('ADMIN'); const parsed = journeyModuleSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) throw new Error('Invalid module.');
  const journey = await draftJourney(actor.id, parsed.data.contentItemId); const id = String(formData.get('id') || '');
  if (id) await db.revisionModule.update({ where: { id }, data: { title: parsed.data.title, description: parsed.data.description || null, displayOrder: parsed.data.displayOrder } });
  else await db.revisionModule.create({ data: { contentRevisionId: journey.draftRevisionId, stableKey: `module-${Date.now()}`, title: parsed.data.title, description: parsed.data.description || null, displayOrder: parsed.data.displayOrder } });
  revalidatePath(`/admin/content/journeys/${parsed.data.contentItemId}`);
}

export async function archiveJourneyModuleAction(formData: FormData) { const actor = await requireRole('ADMIN'); const id = String(formData.get('id')); const moduleRecord = await db.revisionModule.findUniqueOrThrow({ where: { id }, include: { contentRevision: { select: { contentItemId: true } } } }); await draftJourney(actor.id, moduleRecord.contentRevision.contentItemId); await db.revisionModule.update({ where: { id }, data: { isArchived: true } }); revalidatePath(`/admin/content/journeys/${moduleRecord.contentRevision.contentItemId}`); }

export async function saveJourneySectionAction(formData: FormData) { const actor = await requireRole('ADMIN'); const parsed = journeySectionSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) throw new Error('Invalid section.'); const moduleRecord = await db.revisionModule.findUniqueOrThrow({ where: { id: parsed.data.moduleId }, include: { contentRevision: { select: { contentItemId: true } } } }); await draftJourney(actor.id, moduleRecord.contentRevision.contentItemId); const id = String(formData.get('id') || ''); if (id) await db.revisionSection.update({ where: { id }, data: { title: parsed.data.title, displayOrder: parsed.data.displayOrder } }); else await db.revisionSection.create({ data: { revisionModuleId: parsed.data.moduleId, stableKey: `section-${Date.now()}`, title: parsed.data.title, displayOrder: parsed.data.displayOrder } }); revalidatePath(`/admin/content/journeys/${moduleRecord.contentRevision.contentItemId}`); }
export async function archiveJourneySectionAction(formData: FormData) { const actor = await requireRole('ADMIN'); const id = String(formData.get('id')); const section = await db.revisionSection.findUniqueOrThrow({ where: { id }, include: { module: { include: { contentRevision: { select: { contentItemId: true } } } } } }); await draftJourney(actor.id, section.module.contentRevision.contentItemId); await db.revisionSection.update({ where: { id }, data: { isArchived: true } }); revalidatePath(`/admin/content/journeys/${section.module.contentRevision.contentItemId}`); }

export async function saveJourneyBlockAction(formData: FormData) { const actor = await requireRole('ADMIN'); const parsed = journeyBlockSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) throw new Error('Invalid block or payload.'); const section = await db.revisionSection.findUniqueOrThrow({ where: { id: parsed.data.sectionId }, include: { module: { include: { contentRevision: { select: { contentItemId: true } } } } } }); await draftJourney(actor.id, section.module.contentRevision.contentItemId); const id = String(formData.get('id') || ''); const data = { blockType: parsed.data.blockType, schemaVersion: parsed.data.schemaVersion, payload: JSON.parse(parsed.data.payloadJson), displayOrder: parsed.data.displayOrder }; if (id) await db.revisionBlock.update({ where: { id }, data }); else await db.revisionBlock.create({ data: { revisionSectionId: parsed.data.sectionId, ...data } }); revalidatePath(`/admin/content/journeys/${section.module.contentRevision.contentItemId}`); }
export async function archiveJourneyBlockAction(formData: FormData) { const actor = await requireRole('ADMIN'); const id = String(formData.get('id')); const block = await db.revisionBlock.findUniqueOrThrow({ where: { id }, include: { section: { include: { module: { include: { contentRevision: { select: { contentItemId: true } } } } } } } }); await draftJourney(actor.id, block.section.module.contentRevision.contentItemId); await db.revisionBlock.update({ where: { id }, data: { isArchived: true } }); revalidatePath(`/admin/content/journeys/${block.section.module.contentRevision.contentItemId}`); }
