import { z } from 'zod';

export const journeyBlockTypeSchema = z.enum([
  'RICH_TEXT',
  'TABLE',
  'DIAGRAM',
  'IMAGE',
  'API_REFERENCE',
  'CODE',
  'DOWNLOAD',
  'CHECKLIST',
  'REFERENCE',
  'CALLOUT',
]);

const journeyBlockSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  blockType: journeyBlockTypeSchema,
  schemaVersion: z.number().int().min(1),
  payload: z.record(z.string(), z.unknown()),
}).passthrough();

const journeySectionSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  key: z.string().trim().min(1).max(100).optional(),
  title: z.string().trim().min(1).max(180),
  order: z.number().int().min(0).optional(),
  blocks: z.array(journeyBlockSchema).max(100),
}).passthrough();

const journeyModuleSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  key: z.string().trim().min(1).max(100).optional(),
  title: z.string().trim().min(1).max(180),
  order: z.number().int().min(0).optional(),
  sections: z.array(journeySectionSchema).max(100),
}).passthrough();

export const journeyContentSchema = z.object({
  title: z.string().trim().min(5).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  summary: z.string().trim().min(30).max(500),
  schemaVersion: z.number().int().min(1).default(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  modules: z.array(journeyModuleSchema).max(100).optional(),
}).passthrough();

export type JourneyContent = z.infer<typeof journeyContentSchema>;
export const supportedJourneySchemaVersion = 1;

export const journeyBusinessDraftInputSchema = z.object({
  title: z.string().trim().min(5).max(160),
  summary: z.string().trim().min(30).max(500),
  contentJson: z.string().min(2),
});

export function parseJourneyContentJson(value: string): JourneyContent {
  const parsed: unknown = JSON.parse(value);
  return journeyContentSchema.parse(parsed);
}

export function journeyPreviewJson(content: JourneyContent) {
  return JSON.stringify({
    title: content.title,
    summary: content.summary,
  });
}

export function assertJourneyStableSlug(content: JourneyContent, stableSlug: string) {
  if (content.slug !== undefined && content.slug !== stableSlug) {
    throw new Error('Journey stable slug cannot be changed.');
  }
}

const systemOwnedTopLevelFields = new Set([
  'contentItemId',
  'contentType',
  'type',
  'knowledgeScope',
  'knowledgeScopeId',
  'version',
  'status',
  'author',
  'authorId',
  'reviewer',
  'reviewerId',
  'publishedRevisionId',
]);

function parseJsonObject(value: string) {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Journey content must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

export function assertNoPrivilegedJourneyMetadata(
  value: unknown,
  path = 'content',
) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoPrivilegedJourneyMetadata(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    if (/^(storageKey|signedUrl|secret|token|credentials?|authorization)$/i.test(key)) {
      throw new Error(`Privileged metadata is not allowed at ${path}.${key}.`);
    }
    assertNoPrivilegedJourneyMetadata(entry, `${path}.${key}`);
  }
}

export function canonicalizeJourneyDraft(input: {
  authoritativeJson: string;
  submittedJson: string;
  title: string;
  summary: string;
  stableSlug: string;
}) {
  const authoritative = parseJsonObject(input.authoritativeJson);
  const submitted = parseJsonObject(input.submittedJson);
  if (submitted.slug !== undefined && submitted.slug !== input.stableSlug) {
    throw new Error('Journey stable slug cannot be changed.');
  }
  if (
    typeof submitted.title !== 'string'
    || typeof submitted.summary !== 'string'
    || submitted.title.trim() !== input.title
    || submitted.summary.trim() !== input.summary
  ) {
    throw new Error('Title and summary must match the Business Editor values.');
  }
  for (const field of systemOwnedTopLevelFields) {
    if (field in submitted) {
      throw new Error(`System-owned field cannot be edited: ${field}.`);
    }
  }
  assertNoPrivilegedJourneyMetadata(submitted);
  const finalContent = {
    ...authoritative,
    ...submitted,
    title: input.title,
    slug: input.stableSlug,
    summary: input.summary,
    schemaVersion: supportedJourneySchemaVersion,
  };
  assertNoPrivilegedJourneyMetadata(finalContent);
  return journeyContentSchema.parse(finalContent);
}
