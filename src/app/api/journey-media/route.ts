import { get } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { canEditRevision } from '@/lib/permissions';
import { isJourneyMediaPathForSlug, publishedJourneyIncludesMediaPath } from '@/lib/journey-media';
import { requireContentSlugAccess } from '@/server/access-control/require-knowledge-access';
import { requireJourneyCmsAccess } from '@/server/cms/journey-cms-authorization';
import { JourneyCmsRepository } from '@/server/cms/journey-cms-repository';
import { parseJourneyContentJson } from '@/server/cms/journey-content-schema';

export const runtime = 'nodejs';

async function canReadMedia(slug: string, mediaPath: string, revisionId: string | null) {
  if (revisionId) {
    const { user, content } = await requireJourneyCmsAccess(slug, 'EDIT');
    const revision = await JourneyCmsRepository.getEditableRevision(content.id);
    return Boolean(
      revision
      && revision.id === revisionId
      && canEditRevision(user.role, user.id, revision.authorId, revision.status)
      && isJourneyMediaPathForSlug(mediaPath, slug),
    );
  }

  const { content } = await requireContentSlugAccess('BANKING_JOURNEY', slug);
  const published = await JourneyCmsRepository.getPublishedContentJson(content.id);
  if (!published?.publishedRevision || !isJourneyMediaPathForSlug(mediaPath, slug)) return false;
  return publishedJourneyIncludesMediaPath(parseJourneyContentJson(published.publishedRevision.contentJson), mediaPath);
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const mediaPath = request.nextUrl.searchParams.get('path');
  const revisionId = request.nextUrl.searchParams.get('revisionId');
  if (!slug || !mediaPath || !isJourneyMediaPathForSlug(mediaPath, slug)) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    if (!await canReadMedia(slug, mediaPath, revisionId)) return new NextResponse('Not found', { status: 404 });
    const result = await get(mediaPath, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    });
    if (!result) return new NextResponse('Not found', { status: 404 });
    if (result.statusCode === 304) {
      return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' } });
    }
    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        'X-Content-Type-Options': 'nosniff',
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
