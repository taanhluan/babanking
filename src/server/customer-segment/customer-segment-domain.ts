import { z } from 'zod';
import { journeySegments, type JourneySegment } from '@/server/journey-segments';

export const customerSegmentSlugs = ['retail-banking', 'sme', 'enterprise-banking'] as const;
export type CustomerSegmentSlug = typeof customerSegmentSlugs[number];
export const customerSegmentSlugSchema = z.enum(customerSegmentSlugs);
const assetKey = z.enum(customerSegmentSlugs);
const landingSection = z.discriminatedUnion('type', [
  z.object({ type: z.literal('TEXT'), heading: z.string().trim().min(3).max(140), content: z.string().trim().min(20).max(5000) }),
  z.object({ type: z.literal('FEATURE_GRID'), heading: z.string().trim().min(3).max(140), items: z.array(z.object({ title: z.string().trim().min(2).max(120), description: z.string().trim().min(10).max(600) })).min(1).max(12) }),
  z.object({ type: z.literal('IMAGE'), assetKey, alt: z.string().trim().min(5).max(240), caption: z.string().trim().max(300).optional() }),
]);
const localeContent = z.object({ title: z.string().trim().min(3).max(120), description: z.string().trim().min(20).max(700), focus: z.array(z.string().trim().min(2).max(80)).min(1).max(6), alt: z.string().trim().min(5).max(240), sections: z.array(landingSection).max(20).default([]) });
export const customerSegmentContentSchema = z.object({ schemaVersion: z.coerce.number().refine((value) => value === 1 || value === 2, 'schemaVersion must be 1 or 2'), en: localeContent, vi: localeContent, journeys: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(50).superRefine((values, context) => { if (new Set(values).size !== values.length) context.addIssue({ code: 'custom', message: 'Journey assignments must be unique.' }); }) });
export type CustomerSegmentContent = z.infer<typeof customerSegmentContentSchema>;
export const customerSegmentLabels: Record<CustomerSegmentSlug, string> = {
  'retail-banking': 'Retail Banking',
  sme: 'SME',
  'enterprise-banking': 'Enterprise Banking',
};
export function parseCustomerSegmentContent(value: string | unknown): CustomerSegmentContent | null { try { return customerSegmentContentSchema.safeParse(typeof value === 'string' ? JSON.parse(value) : value).data ?? null; } catch { return null; } }
export function fallbackCustomerSegments() { return journeySegments; }
export function segmentFromContent(slug: JourneySegment['slug'], content: CustomerSegmentContent): JourneySegment { return { slug, en: content.en, vi: content.vi, journeys: content.journeys }; }
