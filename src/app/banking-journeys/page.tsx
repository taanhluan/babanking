import { Footer } from '@/components/layout/Footer'; import { Navbar } from '@/components/layout/Navbar'; import { SegmentWelcome } from '@/components/journeys/SegmentWelcome'; import { ContentRepository } from '@/lib/repository';
import { getCurrentLocale } from '@/i18n/server';
import { CustomerSegmentRepository } from '@/server/customer-segment/customer-segment-repository';
export const dynamic = 'force-dynamic'; export const revalidate = 0;
export default async function BankingJourneysPage() { const [items, segments] = await Promise.all([ContentRepository.listByCategory('BANKING_JOURNEY'), CustomerSegmentRepository.getPublishedCatalog()]); const locale = await getCurrentLocale(); return <><Navbar /><SegmentWelcome locale={locale} items={items} segments={segments}/><Footer /></>; }
