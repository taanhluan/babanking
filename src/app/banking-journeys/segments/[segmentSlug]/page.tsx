import { notFound } from 'next/navigation';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { SegmentWelcome } from '@/components/journeys/SegmentWelcome';
import { requirePremiumAccess } from '@/lib/membership';
import { getCurrentLocale } from '@/i18n/server';
import { CustomerSegmentRepository } from '@/server/customer-segment/customer-segment-repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SegmentPage({ params }: { params: Promise<{ segmentSlug: string }> }) {
  await requirePremiumAccess('/banking-journeys');
  const { segmentSlug } = await params;
  const segment = (await CustomerSegmentRepository.getPublishedCatalog()).find((entry) => entry.slug === segmentSlug);
  if (!segment) notFound();
  const locale = await getCurrentLocale();
  return <><Navbar/><SegmentWelcome locale={locale} items={[]} segment={segment}/><Footer/></>;
}
