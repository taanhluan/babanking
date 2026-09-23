import { BlobNotFoundError, head } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
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

function parseClientPayload(value: string | null) {
  try {
    return journeyMediaUploadPayloadSchema.parse(JSON.parse(value ?? ''));
  } catch {
    throw new Error('Invalid media upload request.');
  }
}

async function authorizeEditableMedia(input: ReturnType<typeof parseClientPayload>) {
  const { user, content } = await requireJourneyCmsAccess(input.slug, 'EDIT');
  const revision = await JourneyCmsRepository.getEditableRevision(content.id);
  if (
    !revision
    || revision.id !== input.revisionId
    || !canEditRevision(user.role, user.id, revision.authorId, revision.status)
  ) {
    throw new Error('Media upload is not permitted for this draft.');
  }
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
    return NextResponse.json({ error: 'Media upload could not be authorized.' }, { status: 400 });
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
          throw new Error('Media upload is not permitted for this draft.');
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
  } catch {
    return NextResponse.json({ error: 'Media upload could not be authorized.' }, { status: 400 });
  }
}
