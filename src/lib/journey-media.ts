const DATA_IMAGE_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export const MAX_JOURNEY_MEDIA_DATA_URL_LENGTH = 21_000_000; // 15 MB image + base64 overhead (~33%)
export const MAX_JOURNEY_CONTENT_BYTES = 25 * 1024 * 1024;
const MAX_EXTERNAL_MEDIA_URL_LENGTH = 2_048;

export const JOURNEY_MEDIA_MAX_BYTES = 15 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export function journeyMediaUploadPath(
  slug: string,
  revisionId: string,
  kind: 'image' | 'diagram',
  contentHash?: string,
) {
  if (contentHash && SHA256_PATTERN.test(contentHash)) {
    // Content-addressed paths are immutable and shared across revisions of one
    // journey. This prevents the same file from consuming storage repeatedly.
    return `journey-media/${slug}/sha256/${contentHash}`;
  }
  return `journey-media/${slug}/${revisionId}/${kind}`;
}

export function isSha256Digest(value: unknown): value is string {
  return typeof value === 'string' && SHA256_PATTERN.test(value);
}

export function isJourneyMediaPathForSlug(value: unknown, slug: string): value is string {
  return typeof value === 'string'
    && value.length <= 512
    && value.startsWith(`journey-media/${slug}/`)
    && !value.includes('..')
    && !value.includes('?')
    && !value.includes('#');
}

export function journeyMediaProxyUrl(slug: string, mediaPath: string, revisionId?: string) {
  const params = new URLSearchParams({ slug, path: mediaPath });
  if (revisionId) params.set('revisionId', revisionId);
  return `/api/journey-media?${params.toString()}`;
}

export function isSafeJourneyMediaUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (value.length <= MAX_JOURNEY_MEDIA_DATA_URL_LENGTH && DATA_IMAGE_PATTERN.test(value)) return true;
  if (value.length > MAX_EXTERNAL_MEDIA_URL_LENGTH) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function assertJourneyContentSize(contentJson: string) {
  if (new TextEncoder().encode(contentJson).byteLength > MAX_JOURNEY_CONTENT_BYTES) {
    throw new Error('Journey draft exceeds the 25 MB content limit.');
  }
}
