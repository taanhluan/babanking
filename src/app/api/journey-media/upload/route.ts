import { BlobNotFoundError, head } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { canEditRevision } from '@/lib/permissions';
import { requireJourneyCmsAccess } from '@/server/cms/journey-cms-authorization';
import { JourneyCmsRepository } from '@/server/cms/journey-cms-repository';
import {
  allowedJourneyMediaContentTypes,
  expectedJourneyMediaUploadPath,
  journeyMediaUploadPayloadSchema,
  JOURNEY_MEDIA_MAX_BYTES,
} from '@/server/cms/journey-media-upload-policy';

export const runtime = 'nodejs';

class MediaUploadAuthorizationError extends Error {}

function parseClientPayload(value: string | null) {
  try {
    return journeyMediaUploadPayloadSchema.parse(JSON.parse(value ?? ''));
  } catch {
    throw new Error('Invalid media upload request.');
  }
}

async function authorizeEditableMedia(input: ReturnType<typeof parseClientPayload>) {
  let user: Awaited<ReturnType<typeof requireJourneyCmsAccess>>['user'];
  let content: Awaited<ReturnType<typeof requireJourneyCmsAccess>>['content'];
  try {
    ({ user, content } = await requireJourneyCmsAccess(input.slug, 'EDIT'));
  } catch {
    // Do not let Next's navigation errors be flattened into a misleading 400.
    // The route deliberately returns no content existence information here.
    throw new MediaUploadAuthorizationError();
  }
  const revision = await JourneyCmsRepository.getEditableRevision(content.id);
  if (
    !revision
    || revision.id !== input.revisionId
    || !canEditRevision(user.role, user.id, revision.authorId, revision.status)
  ) {
    throw new MediaUploadAuthorizationError();
  }
}

function uploadErrorResponse(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError || error instanceof Error && error.message === 'Invalid media upload request.') {
    return NextResponse.json({ code: 'invalid_media_request', error: 'The media upload request is invalid.' }, { status: 400 });
  }
  if (error instanceof MediaUploadAuthorizationError) {
    return NextResponse.json({ code: 'media_upload_not_permitted', error: 'Your session or editable draft is no longer available. Refresh and try again.' }, { status: 403 });
  }
  // Do not reveal provider responses, storage identifiers, or stack traces.
  return NextResponse.json({ code: 'media_storage_unavailable', error: 'Media storage is temporarily unavailable. Try again shortly.' }, { status: 502 });
}

export async function GET(request: Request) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Journey media storage is not configured.' }, { status: 503 });
  }

  try {
    const params = new URL(request.url).searchParams;
    const input = journeyMediaUploadPayloadSchema.parse({
      slug: params.get('slug'),
      revisionId: params.get('revisionId'),
      kind: params.get('kind'),
      contentHash: params.get('contentHash'),
    });
    await authorizeEditableMedia(input);
    const pathname = expectedJourneyMediaUploadPath(input);
    await head(pathname, { token });
    return NextResponse.json({ exists: true });
  } catch (error) {
    if (error instanceof BlobNotFoundError) return NextResponse.json({ exists: false });
    return uploadErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Journey media storage is not configured.' }, { status: 503 });
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    const response = await handleUpload({
      token,
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const input = parseClientPayload(clientPayload);
        await authorizeEditableMedia(input);
        if (
          pathname !== expectedJourneyMediaUploadPath(input)
        ) {
          throw new MediaUploadAuthorizationError();
        }

        return {
          allowedContentTypes: allowedJourneyMediaContentTypes(input.kind),
          maximumSizeInBytes: JOURNEY_MEDIA_MAX_BYTES,
          // Content-addressed files are immutable. Existing content is reused by
          // the editor preflight, never overwritten or copied with a suffix.
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
    });
    return NextResponse.json(response);
  } catch (error) {
    return uploadErrorResponse(error);
  }
}
