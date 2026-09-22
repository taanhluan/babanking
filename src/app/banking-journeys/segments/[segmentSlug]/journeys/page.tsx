import { notFound } from 'next/navigation';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { SegmentWelcome } from '@/components/journeys/SegmentWelcome';
import { ContentRepository } from '@/lib/repository';
import { requirePremiumAccess } from '@/lib/membership';
import { getCurrentLocale } from '@/i18n/server';
import { CustomerSegmentRepository } from '@/server/customer-segment/customer-segment-repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SegmentJourneysPage({ params }: { params: Promise<{ segmentSlug: string }> }) {
  await requirePremiumAccess('/banking-journeys');
  const { segmentSlug } = await params;
  const [catalog, items, locale] = await Promise.all([CustomerSegmentRepository.getPublishedCatalog(), ContentRepository.listByCategory('BANKING_JOURNEY'), getCurrentLocale()]);
  const segment = catalog.find((entry) => entry.slug === segmentSlug);
  if (!segment) notFound();
  return <><Navbar/><SegmentWelcome locale={locale} items={items} segment={segment} collection/><Footer/></>;
}
