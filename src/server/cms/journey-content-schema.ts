import { z } from 'zod';
import { assertJourneyContentSize, isJourneyMediaPathForSlug, isSafeJourneyMediaUrl, MAX_JOURNEY_MEDIA_DATA_URL_LENGTH } from '@/lib/journey-media';

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
}).passthrough().superRefine((block, context) => {
  if (!['IMAGE', 'DIAGRAM'].includes(block.blockType)) return;
  const url = block.payload.url;
  if (url !== undefined && !isSafeJourneyMediaUrl(url)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['payload', 'url'],
      message: 'Media URL must be HTTPS or a PNG, JPEG, or WEBP base64 data URL.',
    });
  }
  if (block.payload.mediaPath !== undefined && typeof block.payload.mediaPath !== 'string') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['payload', 'mediaPath'],
      message: 'Media path must be a storage pathname.',
    });
  }
});

export const journeyMediaAssetSchema = z.object({
  kind: z.literal('IMAGE').default('IMAGE'),
  title: z.string().trim().max(180).optional(),
  mediaPath: z.string().trim().min(1).max(512).optional(),
  url: z.string().trim().max(MAX_JOURNEY_MEDIA_DATA_URL_LENGTH).optional(),
  alt: z.string().trim().max(500).default(''),
  caption: z.string().trim().max(1_000).optional(),
  fileName: z.string().trim().max(255).optional(),
  mimeType: z.string().trim().max(100).optional(),
  bytes: z.number().int().positive().max(15 * 1024 * 1024).optional(),
}).superRefine((media, context) => {
  if (media.url !== undefined && !isSafeJourneyMediaUrl(media.url)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['url'],
      message: 'Media URL must be HTTPS or a PNG, JPEG, or WEBP base64 data URL.',
    });
  }
});
export type JourneyMediaAsset = z.infer<typeof journeyMediaAssetSchema>;

const journeySubsectionSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  key: z.string().trim().min(1).max(100).optional(),
  title: z.string().trim().min(1).max(180),
  order: z.number().int().min(0).optional(),
  blocks: z.array(journeyBlockSchema).max(100),
  media: journeyMediaAssetSchema.optional(),
}).passthrough();

const journeySectionSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  key: z.string().trim().min(1).max(100).optional(),
  title: z.string().trim().min(1).max(180),
  order: z.number().int().min(0).optional(),
  blocks: z.array(journeyBlockSchema).max(100),
  subsections: z.array(journeySubsectionSchema).max(20).optional(),
  media: journeyMediaAssetSchema.optional(),
}).passthrough();

const journeyModuleSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  key: z.string().trim().min(1).max(100).optional(),
  title: z.string().trim().min(1).max(180),
  order: z.number().int().min(0).optional(),
  sections: z.array(journeySectionSchema).max(20),
  media: journeyMediaAssetSchema.optional(),
}).passthrough();

export const journeyContentSchema = z.object({
  title: z.string().trim().min(5).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  summary: z.string().trim().min(30).max(500),
  schemaVersion: z.number().int().refine((value) => value === 1 || value === 2, 'schemaVersion must be 1 or 2').default(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  modules: z.array(journeyModuleSchema).max(100).optional(),
}).passthrough();

export type JourneyContent = z.infer<typeof journeyContentSchema>;
export const supportedJourneySchemaVersion = 2;

export const journeyBusinessDraftInputSchema = z.object({
  title: z.string().trim().min(5).max(160),
  summary: z.string().trim().min(30).max(500),
  contentJson: z.string().min(2),
});

export function parseJourneyContentJson(value: string): JourneyContent {
  assertJourneyContentSize(value);
  const parsed: unknown = JSON.parse(value);
  return journeyContentSchema.parse(parsed);
}

export function journeyPreviewJson(content: JourneyContent, plannedSegment?: string | null) {
  return JSON.stringify({
    title: content.title,
    summary: content.summary,
    ...(plannedSegment ? { plannedSegment } : {}),
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

function assertJourneyMediaPaths(value: unknown, stableSlug: string) {
  if (Array.isArray(value)) {
    value.forEach((entry) => assertJourneyMediaPaths(entry, stableSlug));
    return;
  }
  if (!value || typeof value !== 'object') return;
  const record = value as Record<string, unknown>;
  if (
    (record.blockType === 'IMAGE' || record.blockType === 'DIAGRAM')
    && record.payload
    && typeof record.payload === 'object'
    && (record.payload as Record<string, unknown>).mediaPath !== undefined
    && !isJourneyMediaPathForSlug((record.payload as Record<string, unknown>).mediaPath, stableSlug)
  ) {
    throw new Error('Journey media path does not belong to this Journey.');
  }
  if (
    record.media
    && typeof record.media === 'object'
    && (record.media as Record<string, unknown>).mediaPath !== undefined
    && !isJourneyMediaPathForSlug((record.media as Record<string, unknown>).mediaPath, stableSlug)
  ) {
    throw new Error('Journey media path does not belong to this Journey.');
  }
  Object.values(record).forEach((entry) => assertJourneyMediaPaths(entry, stableSlug));
}

export function canonicalizeJourneyDraft(input: {
  authoritativeJson: string;
  submittedJson: string;
  title: string;
  summary: string;
  stableSlug: string;
}) {
  assertJourneyContentSize(input.submittedJson);
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
  const submittedMetadata = submitted.metadata && typeof submitted.metadata === 'object' && !Array.isArray(submitted.metadata)
    ? submitted.metadata as Record<string, unknown>
    : {};
  const baseContent = submittedMetadata.journeyReader === 'canonical' ? {} : authoritative;
  const schemaVersion = submitted.schemaVersion === 2 || authoritative.schemaVersion === 2 ? 2 : 1;
  const finalContent = {
    ...baseContent,
    ...submitted,
    title: input.title,
    slug: input.stableSlug,
    summary: input.summary,
    schemaVersion,
  };
  assertNoPrivilegedJourneyMetadata(finalContent);
  assertJourneyMediaPaths(finalContent, input.stableSlug);
  return journeyContentSchema.parse(finalContent);
}
