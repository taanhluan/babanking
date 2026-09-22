const DATA_IMAGE_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export const MAX_JOURNEY_MEDIA_DATA_URL_LENGTH = 3_000_000;
export const MAX_JOURNEY_CONTENT_BYTES = 7 * 1024 * 1024;
const MAX_EXTERNAL_MEDIA_URL_LENGTH = 2_048;

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
    throw new Error('Journey draft exceeds the 7 MB content limit.');
  }
}
