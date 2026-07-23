import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { PageHero } from '@/components/layout/PageHero';
import { JourneyExplorer } from '@/components/journeys/JourneyExplorer';
import { bankingJourneyContent } from '@/data/content';
import { Container } from '@/components/ui/Container';
import { bankingJourneys, journeyCategories } from '@/data/banking-journeys';
import { requirePremiumAccess } from '@/lib/membership';
import {getCurrentLocale} from '@/i18n/server'; import {TranslationUnavailable} from '@/components/content/TranslationUnavailable';

export default async function BankingJourneysPage() {
  await requirePremiumAccess('/banking-journeys');
  if(await getCurrentLocale()==='vi')return <TranslationUnavailable englishPath="/banking-journeys"/>;
  return <><Navbar /><main><PageHero eyebrow="Banking Domain Knowledge" title="Explore Banking Journeys" description="Understand how banking products and services operate across customer experiences, business processes, controls, systems, and delivery teams." current="Banking Journeys" /><section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16"><Container><JourneyExplorer journeys={bankingJourneys} categories={journeyCategories} slugs={Object.fromEntries(bankingJourneyContent.map(x=>[x.title,x.slug]))} /></Container></section></main><Footer /></>;
}
