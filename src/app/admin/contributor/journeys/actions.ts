'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireJourneyCmsAccess } from '@/server/cms/journey-cms-authorization';
import { journeyBusinessDraftInputSchema } from '@/server/cms/journey-content-schema';
import { getJourneyCmsActionErrorCode } from '@/server/cms/journey-cms-action-errors';
import {
  createJourneyDraftFromPublished,
  publishJourneyRevision,
  reviewJourneyRevision,
  rollbackJourneyRevision,
  saveJourneyDraft,
  setJourneyArchived,
  submitJourneyRevision,
} from '@/server/cms/journey-cms-service';

const slugInput = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const revisionInput = z.string().cuid();

function refresh(slug: string) {
  revalidatePath('/admin/contributor/journeys');
  revalidatePath(`/admin/contributor/journeys/${slug}`);
  revalidatePath('/banking-journeys');
  revalidatePath(`/banking-journeys/${slug}`);
}

async function runJourneyCmsMutation(slug: string, mutation: () => Promise<unknown>) {
  try {
    await mutation();
  } catch (error) {
    const code = getJourneyCmsActionErrorCode(error);
    if (!code) throw error;
    redirect(`/admin/contributor/journeys/${slug}?error=${code}`);
  }
  refresh(slug);
}

export async function createJourneyDraftAction(formData: FormData) {
  const slug = slugInput.parse(formData.get('slug'));
  const { user, content } = await requireJourneyCmsAccess(slug, 'EDIT');
  await runJourneyCmsMutation(slug, () => createJourneyDraftFromPublished(content.id, user));
}

export async function saveJourneyDraftAction(formData: FormData) {
  const slug = slugInput.parse(formData.get('slug'));
  const revisionId = revisionInput.parse(formData.get('revisionId'));
  const draft = journeyBusinessDraftInputSchema.parse({
    title: formData.get('title'),
    summary: formData.get('summary'),
    contentJson: formData.get('contentJson'),
  });
  const { user, content } = await requireJourneyCmsAccess(slug, 'EDIT');
  await runJourneyCmsMutation(slug, () => saveJourneyDraft(
    content.id,
    revisionId,
    draft.title,
    draft.summary,
    draft.contentJson,
    user,
  ));
}

export async function submitJourneyRevisionAction(formData: FormData) {
  const slug = slugInput.parse(formData.get('slug'));
  const revisionId = revisionInput.parse(formData.get('revisionId'));
  const { user, content } = await requireJourneyCmsAccess(slug, 'EDIT');
  await runJourneyCmsMutation(slug, () => submitJourneyRevision(content.id, revisionId, user));
}

export async function reviewJourneyRevisionAction(formData: FormData) {
  const slug = slugInput.parse(formData.get('slug'));
  const revisionId = revisionInput.parse(formData.get('revisionId'));
  const decision = z.enum(['changes', 'reject']).parse(formData.get('decision'));
  const note = z.string().trim().min(10).max(1000).parse(formData.get('reviewNote'));
  const { user, content } = await requireJourneyCmsAccess(slug, 'REVIEW');
  await runJourneyCmsMutation(slug, () => reviewJourneyRevision(content.id, revisionId, decision, note, user));
}

export async function publishJourneyRevisionAction(formData: FormData) {
  const slug = slugInput.parse(formData.get('slug'));
  const revisionId = revisionInput.parse(formData.get('revisionId'));
  const { user, content } = await requireJourneyCmsAccess(slug, 'PUBLISH');
  await runJourneyCmsMutation(slug, () => publishJourneyRevision(content.id, revisionId, user));
}

export async function rollbackJourneyRevisionAction(formData: FormData) {
  const slug = slugInput.parse(formData.get('slug'));
  const revisionId = revisionInput.parse(formData.get('revisionId'));
  const { user, content } = await requireJourneyCmsAccess(slug, 'MANAGE');
  await runJourneyCmsMutation(slug, () => rollbackJourneyRevision(content.id, revisionId, user));
}

export async function setJourneyArchivedAction(formData: FormData) {
  const slug = slugInput.parse(formData.get('slug'));
  const archived = z.enum(['true', 'false']).parse(formData.get('archived')) === 'true';
  const { user, content } = await requireJourneyCmsAccess(slug, 'MANAGE');
  await runJourneyCmsMutation(slug, () => setJourneyArchived(content.id, archived, user));
}
