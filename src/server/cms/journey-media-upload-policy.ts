import { z } from 'zod';
import { JOURNEY_MEDIA_MAX_BYTES, isSha256Digest, journeyMediaUploadPath } from '@/lib/journey-media';

export const journeyMediaUploadPayloadSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  revisionId: z.string().cuid(),
  kind: z.enum(['image', 'diagram']),
  contentHash: z.string().refine(isSha256Digest, 'Invalid media content hash.'),
});

export function allowedJourneyMediaContentTypes(kind: 'image' | 'diagram') {
  return kind === 'diagram'
    ? ['image/png']
    : ['image/jpeg', 'image/png', 'image/webp'];
}

export function expectedJourneyMediaUploadPath(input: z.infer<typeof journeyMediaUploadPayloadSchema>) {
  return journeyMediaUploadPath(input.slug, input.revisionId, input.kind, input.contentHash);
}

export { JOURNEY_MEDIA_MAX_BYTES };
