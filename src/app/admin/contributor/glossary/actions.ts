'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { glossaryKinds, glossarySlugPattern } from '@/server/glossary/glossary-domain';
import { glossaryContentFromForm } from '@/server/glossary/glossary-form';
import {
  createGlossaryDraft, createGlossaryEntry, publishGlossaryEntry, reviewGlossaryEntry, rollbackGlossaryEntry,
  saveGlossaryEntry, setGlossaryEntryArchived, submitGlossaryEntry,
} from '@/server/glossary/glossary-service';

const slugSchema = z.string().trim().regex(glossarySlugPattern).max(120);
const revisionSchema = z.string().cuid();

function message(error: unknown) {
  if (error instanceof z.ZodError) return error.issues.slice(0, 5).map((issue) => `${issue.path.join('.') || 'content'}: ${issue.message}`).join('; ');
  return error instanceof Error ? error.message.slice(0, 400) : 'The request could not be completed.';
}

function editorPath(slug: string, error?: string) {
  return (error ? `/admin/contributor/glossary/${slug}?error=${encodeURIComponent(error)}` : `/admin/contributor/glossary/${slug}`) as Route;
}

async function loadItem(slug: string) {
  const item = await db.contentItem.findUnique({ where: { type_slug: { type: 'GLOSSARY_ENTRY', slug } }, select: { id: true } });
  if (!item) throw new Error('Glossary entry not found.');
  return item;
}

function revalidateGlossary(slug: string) {
  revalidatePath('/admin/contributor/glossary');
  revalidatePath(`/admin/contributor/glossary/${slug}`);
  revalidatePath('/glossary');
  revalidatePath(`/glossary/${slug}`);
  revalidatePath('/search');
  revalidatePath('/review');
}

/** Runs a governed mutation for one entry and redirects back to its editor with a clean URL or an error. */
async function mutate(formData: FormData, operation: (input: { slug: string; contentItemId: string; actor: { id: string; role: 'ADMIN' } }) => Promise<unknown>) {
  const actor = await requireRole('ADMIN');
  const slug = slugSchema.parse(formData.get('slug'));
  let error: string | undefined;
  try {
    const item = await loadItem(slug);
    await operation({ slug, contentItemId: item.id, actor: { id: actor.id, role: 'ADMIN' } });
    revalidateGlossary(slug);
  } catch (caught) {
    error = message(caught);
  }
  redirect(editorPath(slug, error));
}

export async function createGlossaryEntryAction(formData: FormData) {
  const actor = await requireRole('ADMIN');
  const slug = String(formData.get('slug') ?? '').trim();
  let error: string | undefined;
  try {
    const kind = z.enum(glossaryKinds).parse(formData.get('kind'));
    const name = z.string().trim().min(1).max(200).parse(formData.get('name'));
    await createGlossaryEntry({ slug: slugSchema.parse(slug), kind, name }, { id: actor.id, role: actor.role });
    revalidatePath('/admin/contributor/glossary');
  } catch (caught) {
    error = message(caught);
  }
  redirect((error ? `/admin/contributor/glossary?error=${encodeURIComponent(error)}` : `/admin/contributor/glossary/${slug}`) as Route);
}

export async function saveGlossaryFormAction(formData: FormData) {
  await mutate(formData, ({ contentItemId, actor }) => saveGlossaryEntry(contentItemId, revisionSchema.parse(formData.get('revisionId')), glossaryContentFromForm(formData), actor));
}

export async function saveGlossaryJsonAction(formData: FormData) {
  await mutate(formData, ({ contentItemId, actor }) => {
    let value: unknown;
    try { value = JSON.parse(String(formData.get('contentJson') ?? '')); } catch { throw new Error('Advanced JSON is not valid JSON.'); }
    return saveGlossaryEntry(contentItemId, revisionSchema.parse(formData.get('revisionId')), value, actor);
  });
}

export async function createGlossaryDraftAction(formData: FormData) {
  await mutate(formData, ({ contentItemId, actor }) => createGlossaryDraft(contentItemId, actor));
}

export async function submitGlossaryAction(formData: FormData) {
  await mutate(formData, ({ contentItemId, actor }) => submitGlossaryEntry(contentItemId, revisionSchema.parse(formData.get('revisionId')), actor));
}

export async function reviewGlossaryAction(formData: FormData) {
  await mutate(formData, ({ contentItemId, actor }) => {
    const decision = z.enum(['changes', 'reject']).parse(formData.get('decision'));
    return reviewGlossaryEntry(contentItemId, revisionSchema.parse(formData.get('revisionId')), decision, String(formData.get('reviewNote') ?? ''), actor);
  });
}

export async function publishGlossaryAction(formData: FormData) {
  await mutate(formData, ({ contentItemId, actor }) => publishGlossaryEntry(contentItemId, revisionSchema.parse(formData.get('revisionId')), actor));
}

export async function rollbackGlossaryAction(formData: FormData) {
  await mutate(formData, ({ contentItemId, actor }) => rollbackGlossaryEntry(contentItemId, revisionSchema.parse(formData.get('revisionId')), actor));
}

export async function archiveGlossaryAction(formData: FormData) {
  await mutate(formData, ({ contentItemId, actor }) => setGlossaryEntryArchived(contentItemId, formData.get('archived') === 'true', actor));
}
