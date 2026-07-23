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
import { careerPreferenceSchema, contentDraftSchema, loginSchema, progressSchema, reservedSlugs } from '@/lib/validation';

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
  if (existing) await db.bookmark.delete({ where: { id: existing.id } }); else await db.bookmark.create({ data: { userId: user.id, contentItemId } });
  revalidatePath('/workspace/bookmarks');
}
export async function updateProgressAction(formData: FormData) {
  const user = await requirePremiumAccess(), parsed = progressSchema.parse(Object.fromEntries(formData));
  await db.readingActivity.upsert({ where: { userId_contentItemId: { userId: user.id, contentItemId: parsed.contentItemId } }, update: { progress: parsed.progress, completed: parsed.progress === 100, lastViewedAt: new Date() }, create: { userId: user.id, contentItemId: parsed.contentItemId, progress: parsed.progress, completed: parsed.progress === 100 } });
  revalidatePath('/workspace/history');
}
export async function saveCareerPreferenceAction(formData: FormData) {
  const user = await requirePremiumAccess(), parsed = careerPreferenceSchema.parse(Object.fromEntries(formData));
  await db.userCareerPreference.upsert({ where: { userId: user.id }, update: parsed, create: { userId: user.id, ...parsed } }); revalidatePath('/workspace/roadmap');
}
export async function createDraftAction(formData: FormData) {
  const user = await requireRole('CONTRIBUTOR'), parsed = contentDraftSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect('/contributor/content/new?error=validation');
  if (reservedSlugs.has(parsed.data.slug)) redirect('/contributor/content/new?error=slug');
  const existing = await db.contentItem.findUnique({ where: { type_slug: { type: parsed.data.type, slug: parsed.data.slug } } }); if (existing) redirect('/contributor/content/new?error=slug');
  const item = await db.contentItem.create({ data: { type: parsed.data.type, slug: parsed.data.slug, ownerId: user.id } });
  const content = { ...JSON.parse(parsed.data.contentJson), title: parsed.data.title, slug: parsed.data.slug, summary: parsed.data.summary };
  const revision = await db.contentRevision.create({ data: { contentItemId: item.id, version: 1, contentJson: JSON.stringify(content), authorId: user.id } });
  await db.auditLog.create({ data: { actorId: user.id, action: 'DRAFT_CREATED', entityType: 'ContentRevision', entityId: revision.id } });
  redirect(`/contributor/content/${item.id}/edit`);
}
export async function saveDraftAction(formData: FormData) {
  const user = await requireRole('CONTRIBUTOR'), revisionId = String(formData.get('revisionId')), contentJson = String(formData.get('contentJson') || '');
  const revision = await db.contentRevision.findUnique({ where: { id: revisionId } }); if (!revision || !canEditRevision(user.role, user.id, revision.authorId, revision.status)) throw new Error('Not authorized to edit this revision.');
  JSON.parse(contentJson); await db.contentRevision.update({ where: { id: revision.id }, data: { contentJson } });
  await db.auditLog.create({ data: { actorId: user.id, action: 'DRAFT_UPDATED', entityType: 'ContentRevision', entityId: revision.id } }); revalidatePath(`/contributor/content/${revision.contentItemId}/edit`);
}
export async function submitRevisionAction(formData: FormData) {
  const user = await requireRole('CONTRIBUTOR'), revisionId = String(formData.get('revisionId'));
  const revision = await db.contentRevision.findUnique({ where: { id: revisionId } }); if (!revision || revision.authorId !== user.id || !canTransition(revision.status, 'SUBMIT')) throw new Error('Revision cannot be submitted.');
  await db.contentRevision.update({ where: { id: revision.id }, data: { status: 'IN_REVIEW', submittedAt: new Date(), reviewNote: null } });
  await db.auditLog.create({ data: { actorId: user.id, action: 'REVISION_SUBMITTED', entityType: 'ContentRevision', entityId: revision.id } }); redirect('/contributor');
}
export async function reviewRevisionAction(formData: FormData) {
  const user = await requireRole('REVIEWER'), revisionId = String(formData.get('revisionId')), action = String(formData.get('action')), note = String(formData.get('reviewNote') || '').trim();
  const revision = await db.contentRevision.findUnique({ where: { id: revisionId }, include: { contentItem: true } }); if (!revision || !canReviewRevision(user.role, user.id, revision.authorId) || revision.status !== 'IN_REVIEW') throw new Error('Revision cannot be reviewed.');
  if ((action === 'changes' || action === 'reject') && note.length < 10) throw new Error('A review note is required.');
  if (action === 'publish') await db.$transaction(async (tx) => {
    const now = new Date(); await tx.contentRevision.update({ where: { id: revision.id }, data: { status: 'PUBLISHED', reviewerId: user.id, reviewedAt: now, publishedAt: now, reviewNote: note || null } });
    await tx.contentItem.update({ where: { id: revision.contentItemId }, data: { publishedRevisionId: revision.id } });
    await tx.auditLog.create({ data: { actorId: user.id, action: 'CONTENT_PUBLISHED', entityType: 'ContentItem', entityId: revision.contentItemId } });
  }); else {
    const status = action === 'changes' ? 'CHANGES_REQUESTED' : 'REJECTED';
    await db.contentRevision.update({ where: { id: revision.id }, data: { status, reviewerId: user.id, reviewedAt: new Date(), reviewNote: note } });
    await db.auditLog.create({ data: { actorId: user.id, action: action === 'changes' ? 'CHANGES_REQUESTED' : 'REVISION_REJECTED', entityType: 'ContentRevision', entityId: revision.id } });
  }
  revalidatePath('/review'); revalidatePath('/search'); revalidatePath('/banking-journeys'); revalidatePath('/ba-practice'); revalidatePath('/case-studies'); revalidatePath('/career-roadmap'); redirect('/review');
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
