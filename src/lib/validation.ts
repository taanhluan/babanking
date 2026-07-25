import { z } from 'zod';
export const loginSchema = z.object({ email: z.email().transform((v) => v.trim().toLowerCase()), password: z.string().min(12).max(128), callbackUrl: z.string().optional(), locale: z.enum(['en','vi']).default('en') });
export const slugSchema = z.string().min(3).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const reservedSlugs = new Set(['login', 'workspace', 'contributor', 'review', 'admin', 'search', 'api']);
export const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export const contentDraftSchema = z.object({
  type: z.enum(['BANKING_JOURNEY', 'BA_PRACTICE', 'CASE_STUDY', 'CAREER_LEVEL']),
  title: z.string().trim().min(5).max(160), slug: slugSchema, summary: z.string().trim().min(30).max(500),
  contentJson: z.string().min(2).refine((value) => { try { const data: unknown = JSON.parse(value); return typeof data === 'object' && data !== null; } catch { return false; } }, 'Content must be valid JSON.'),
});
export const journeyMetadataSchema = z.object({
  title: z.string().trim().min(5).max(160),
  slug: slugSchema,
  summary: z.string().trim().min(30).max(500),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  category: z.string().trim().max(120).optional().or(z.literal('')),
  journeyType: z.string().trim().max(120).optional().or(z.literal('')),
  tagsJson: z.string().refine((value) => { try { return Array.isArray(JSON.parse(value)); } catch { return false; } }, 'Tags must be a JSON array.'),
  displayOrder: z.coerce.number().int().min(0).max(100000),
  seoTitle: z.string().trim().max(160).optional().or(z.literal('')),
  seoDescription: z.string().trim().max(320).optional().or(z.literal('')),
  heroImageMetadataJson: z.string().refine((value) => { try { const parsed = JSON.parse(value); return parsed === null || (typeof parsed === 'object' && !Array.isArray(parsed)); } catch { return false; } }, 'Hero image metadata must be a JSON object.'),
});
export const journeyModuleSchema = z.object({ contentItemId: z.string().cuid(), title: z.string().trim().min(2).max(160), description: z.string().trim().max(1000).optional().or(z.literal('')), displayOrder: z.coerce.number().int().min(0).max(100000) });
export const journeySectionSchema = z.object({ moduleId: z.string().cuid(), title: z.string().trim().min(2).max(160), displayOrder: z.coerce.number().int().min(0).max(100000) });
export const journeyBlockSchema = z.object({ sectionId: z.string().cuid(), blockType: z.enum(['RICH_TEXT', 'TABLE', 'IMAGE', 'DIAGRAM', 'API_EXAMPLE', 'BUSINESS_RULE', 'CHECKLIST', 'CALLOUT', 'REFERENCE', 'DOWNLOAD']), schemaVersion: z.coerce.number().int().min(1).max(100), payloadJson: z.string().refine((value) => { try { const parsed = JSON.parse(value); return parsed !== null && typeof parsed === 'object'; } catch { return false; } }, 'Block payload must be a JSON object.'), displayOrder: z.coerce.number().int().min(0).max(100000) });
export const careerPreferenceSchema = z.object({ currentLevelSlug: slugSchema, targetLevelSlug: slugSchema });
export const progressSchema = z.object({ contentItemId: z.string().cuid(), progress: z.coerce.number().int().min(0).max(100) });
export const accessRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().transform((v) => v.trim().toLowerCase()),
  organization: z.string().trim().max(120).optional().or(z.literal('')),
  jobTitle: z.string().trim().min(2).max(120),
  currentBALevel: z.string().trim().max(80).optional().or(z.literal('')),
  primaryInterest: z.string().trim().min(2).max(120),
  professionalObjective: z.string().trim().min(20).max(700),
  requestedPlanId: z.string().cuid().optional().or(z.literal('')),
  preferredLocale: z.enum(['en', 'vi']).default('en'),
  consentAccepted: z.literal('on'),
});
export const planSchema = z.object({
  planId: z.string().cuid().optional().or(z.literal('')),
  name: z.string().trim().min(3).max(100),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]{3,40}$/),
  description: z.string().trim().min(20).max(500),
  price: z.coerce.number().int().min(0),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  billingPeriod: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM']),
  durationDays: z.coerce.number().int().min(1).max(3650),
  features: z.string().trim().max(2000),
  displayOrder: z.coerce.number().int().min(0).max(1000),
  isActive: z.string().optional(),
  isPublic: z.string().optional(),
});
export const paymentSchema = z.object({
  accessRequestId: z.string().cuid().optional().or(z.literal('')),
  userId: z.string().cuid().optional().or(z.literal('')),
  planId: z.string().cuid().optional().or(z.literal('')),
  amount: z.coerce.number().int().min(0),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  method: z.string().trim().min(2).max(80),
  provider: z.string().trim().max(80).optional().or(z.literal('')),
  providerReference: z.string().trim().max(120).optional().or(z.literal('')),
  adminNote: z.string().trim().max(1000).optional().or(z.literal('')),
});
export const activationPasswordSchema = z.object({
  token: z.string().min(32).max(200),
  password: z.string().min(12).max(128),
  confirmPassword: z.string().min(12).max(128),
}).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
