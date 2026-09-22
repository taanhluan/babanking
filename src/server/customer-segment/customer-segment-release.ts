import { createHash } from 'node:crypto';
import { z } from 'zod';
import { customerSegmentContentSchema, customerSegmentSlugSchema } from './customer-segment-domain';

export const customerSegmentReleaseEntrySchema = z.object({
  slug: customerSegmentSlugSchema,
  sourceEnvironment: z.literal('development'),
  sourceRevisionId: z.string().min(1),
  sourceVersion: z.number().int().positive(),
  sourcePublishedAt: z.string().datetime(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  content: customerSegmentContentSchema,
});

export const customerSegmentReleaseSchema = z.object({
  releaseId: z.string().regex(/^customer-segments-[a-z0-9-]+$/),
  createdAt: z.string().datetime(),
  entries: z.array(customerSegmentReleaseEntrySchema).min(1).max(3),
}).superRefine((release, context) => {
  if (new Set(release.entries.map((entry) => entry.slug)).size !== release.entries.length) {
    context.addIssue({ code: 'custom', message: 'Release segment slugs must be unique.' });
  }
  for (const entry of release.entries) {
    if (customerSegmentContentHash(entry.content) !== entry.sourceHash) {
      context.addIssue({ code: 'custom', path: ['entries', release.entries.indexOf(entry), 'sourceHash'], message: 'Release content hash does not match sourceHash.' });
    }
  }
});

export type CustomerSegmentRelease = z.infer<typeof customerSegmentReleaseSchema>;

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable((value as Record<string, unknown>)[key])]));
  return value;
}

export function canonicalCustomerSegmentJson(value: unknown) {
  return JSON.stringify(stable(value));
}

export function customerSegmentContentHash(value: unknown) {
  return createHash('sha256').update(canonicalCustomerSegmentJson(value)).digest('hex');
}
