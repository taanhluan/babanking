import { createHash } from 'node:crypto';
import { z } from 'zod';
import { journeyContentSchema } from '@/server/cms/journey-content-schema';
import { customerSegmentContentHash } from './customer-segment-release';
import { customerSegmentContentSchema } from './customer-segment-domain';

export const SME_ENTERPRISE_RELEASE_ID = 'sme-enterprise-banking-2026-09-21-v1';
export const RETAIL_PRODUCTION_GUARD_HASH = '2e7811e638e5857c5f1bbc1485b4aaa9761fc44fd20368084d5137356bce9b7f';

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable((value as Record<string, unknown>)[key])]));
  }
  return value;
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(stable(value));
}

export function canonicalContentHash(value: unknown) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

const sourceSchema = z.object({
  sourceEnvironment: z.literal('development'),
  sourceRevisionId: z.string().min(1),
  sourceVersion: z.number().int().positive(),
  sourcePublishedAt: z.string().datetime(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
});

const journeyEntrySchema = sourceSchema.extend({
  slug: z.string().regex(/^(sme|enterprise)-[a-z0-9-]+$/),
  segment: z.enum(['sme', 'enterprise-banking']),
  scopeCode: z.string().min(1),
  content: journeyContentSchema,
});

const segmentEntrySchema = sourceSchema.extend({
  slug: z.enum(['sme', 'enterprise-banking']),
  content: customerSegmentContentSchema,
});

export const smeEnterpriseReleaseSchema = z.object({
  releaseId: z.literal(SME_ENTERPRISE_RELEASE_ID),
  createdAt: z.string().datetime(),
  retailGuard: z.object({ slug: z.literal('retail-banking'), productionHash: z.literal(RETAIL_PRODUCTION_GUARD_HASH) }),
  journeys: z.array(journeyEntrySchema).length(20),
  segments: z.array(segmentEntrySchema).length(2),
}).superRefine((release, context) => {
  const journeySlugs = release.journeys.map((entry) => entry.slug);
  if (new Set(journeySlugs).size !== journeySlugs.length) context.addIssue({ code: 'custom', message: 'Journey slugs must be unique.' });
  if (new Set(release.segments.map((entry) => entry.slug)).size !== 2) context.addIssue({ code: 'custom', message: 'Both target segments are required.' });
  release.journeys.forEach((entry, index) => {
    if (canonicalContentHash(entry.content) !== entry.sourceHash) context.addIssue({ code: 'custom', path: ['journeys', index, 'sourceHash'], message: 'Journey hash mismatch.' });
    if (entry.content.slug !== entry.slug || entry.content.metadata?.customerSegment !== entry.segment) context.addIssue({ code: 'custom', path: ['journeys', index], message: 'Journey identity mismatch.' });
  });
  release.segments.forEach((entry, index) => {
    if (customerSegmentContentHash(entry.content) !== entry.sourceHash) context.addIssue({ code: 'custom', path: ['segments', index, 'sourceHash'], message: 'Segment hash mismatch.' });
    const expected = release.journeys.filter((journey) => journey.segment === entry.slug).map((journey) => journey.slug).sort();
    if (JSON.stringify([...entry.content.journeys].sort()) !== JSON.stringify(expected)) context.addIssue({ code: 'custom', path: ['segments', index, 'content', 'journeys'], message: 'Segment assignments do not match release Journeys.' });
  });
});

export type SmeEnterpriseRelease = z.infer<typeof smeEnterpriseReleaseSchema>;
