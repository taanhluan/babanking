'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { createCustomerSegment, createCustomerSegmentDraft, publishCustomerSegment, reviewCustomerSegment, saveCustomerSegment, submitCustomerSegment } from '@/server/customer-segment/customer-segment-service';
import { customerSegmentContentSchema, customerSegmentSlugSchema } from '@/server/customer-segment/customer-segment-domain';

function refresh(slug?: string) { revalidatePath('/admin/customer-segments'); revalidatePath('/banking-journeys'); if (slug) revalidatePath(`/banking-journeys/segments/${slug}`); }
export async function createCustomerSegmentAction(formData: FormData) { const actor = await requireRole('ADMIN'); const item = await createCustomerSegment(customerSegmentSlugSchema.parse(formData.get('slug')), actor); refresh(item.slug); redirect(`/admin/customer-segments/${item.slug}`); }
export async function createCustomerSegmentDraftAction(formData: FormData) { const actor = await requireRole('ADMIN'); const slug = customerSegmentSlugSchema.parse(formData.get('slug')); const item = await (await import('@/lib/db')).db.contentItem.findUnique({ where: { type_slug: { type: 'CUSTOMER_SEGMENT', slug } }, select: { id: true } }); if (!item) throw new Error('Customer Segment not found.'); await createCustomerSegmentDraft(item.id, actor); refresh(slug); redirect(`/admin/customer-segments/${slug}`); }
export async function saveCustomerSegmentAction(formData: FormData) {
  const actor = await requireRole('ADMIN');
  const slug = customerSegmentSlugSchema.parse(formData.get('slug'));
  const revisionId = z.string().cuid().parse(formData.get('revisionId'));
  let value: unknown;
  try {
    value = JSON.parse(String(formData.get('contentJson') ?? ''));
  } catch {
    redirect(`/admin/customer-segments/${slug}?error=invalid-json`);
  }
  if (formData.get('journeyAssignmentEditor') === '1' && value && typeof value === 'object' && !Array.isArray(value)) {
    value = { ...value, journeys: formData.getAll('journeys').map(String) };
  }
  const parsed = customerSegmentContentSchema.safeParse(value);
  if (!parsed.success) redirect(`/admin/customer-segments/${slug}?error=invalid-segment-schema`);
  const item = await (await import('@/lib/db')).db.contentItem.findUnique({ where: { type_slug: { type: 'CUSTOMER_SEGMENT', slug } }, select: { id: true } });
  if (!item) throw new Error('Customer Segment not found.');
  await saveCustomerSegment(item.id, revisionId, parsed.data, actor);
  refresh(slug);
  redirect(`/admin/customer-segments/${slug}`);
}
export async function submitCustomerSegmentAction(formData: FormData) { const actor = await requireRole('ADMIN'); const slug = customerSegmentSlugSchema.parse(formData.get('slug')); const revisionId = z.string().cuid().parse(formData.get('revisionId')); const item = await (await import('@/lib/db')).db.contentItem.findUnique({ where: { type_slug: { type: 'CUSTOMER_SEGMENT', slug } }, select: { id: true } }); if (!item) throw new Error('Customer Segment not found.'); await submitCustomerSegment(item.id, revisionId, actor); refresh(slug); redirect('/admin/customer-segments'); }
export async function reviewCustomerSegmentAction(formData: FormData) { const actor = await requireRole('REVIEWER'); const revisionId = z.string().cuid().parse(formData.get('revisionId')); const action = z.enum(['changes', 'reject', 'publish']).parse(formData.get('action')); const note = z.string().trim().max(1000).parse(formData.get('reviewNote') ?? ''); const revision = await (await import('@/lib/db')).db.contentRevision.findUnique({ where: { id: revisionId }, select: { contentItemId: true, contentItem: { select: { slug: true, type: true } } } }); if (!revision || revision.contentItem.type !== 'CUSTOMER_SEGMENT') throw new Error('Customer Segment revision not found.'); if (action === 'publish') await publishCustomerSegment(revision.contentItemId, revisionId, actor); else { if (note.length < 10) throw new Error('A review note is required.'); await reviewCustomerSegment(revision.contentItemId, revisionId, action, note, actor); } refresh(revision.contentItem.slug); redirect('/review'); }
