import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';
import { requireContentSlugAccess } from '@/server/access-control/require-knowledge-access';
import { getServerEnvironment } from '@/server/env';
import { getJourneyMockup, getMockupResource, isDevelopmentMockupEnvironment } from '@/server/journey-mockups/catalog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

type Context = { params: Promise<{ slug: string; asset?: string[] }> };

export async function GET(_request: Request, { params }: Context) {
  if (!isDevelopmentMockupEnvironment(getServerEnvironment())) notFound();
  const { slug, asset } = await params;
  const mockup = getJourneyMockup(slug);
  if (!mockup) notFound();

  // Every document, module, image and font uses the Journey's normal VIEW gate.
  await requireContentSlugAccess('BANKING_JOURNEY', slug);
  const resource = getMockupResource(mockup, asset);
  if (!resource) notFound();

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await readFile(path.join(process.cwd(), 'docs/mockups', mockup.directory, resource.file)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') notFound();
    throw error;
  }
  let body: BodyInit = bytes;
  if (resource.file === 'index.html') {
    // File-extension requests bypass locale rewriting. Keep asset URLs on the
    // unprefixed protected handler; the visible document URL stays localized.
    const base = `/banking-journeys/${slug}/mockup/`;
    body = Buffer.from(bytes).toString('utf8').replace('<head>', `<head><base href="${base}">`);
  }

  return new Response(body, {
    headers: {
      'Content-Type': resource.contentType,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'self'",
    },
  });
}
