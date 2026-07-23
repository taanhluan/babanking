import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { PageHero } from '@/components/layout/PageHero';
import { CareerRoadmapExplorer } from '@/components/roadmap/CareerRoadmapExplorer';
import { careerLevelContent } from '@/data/content';
import { Container } from '@/components/ui/Container';
import { careerLevels } from '@/data/career-roadmap';
import { requirePremiumAccess } from '@/lib/membership';
import {getCurrentLocale} from '@/i18n/server'; import {TranslationUnavailable} from '@/components/content/TranslationUnavailable';

export default async function CareerRoadmapPage() {
  await requirePremiumAccess('/career-roadmap');
  if(await getCurrentLocale()==='vi')return <TranslationUnavailable englishPath="/career-roadmap"/>;
  return <><Navbar /><main><PageHero eyebrow="BA Career Roadmap" title="Build a Clear Path from Foundation to Leadership" description="Explore how banking knowledge, analysis responsibility, stakeholder influence, and delivery outputs develop across Business Analyst career levels." current="Career Roadmap" /><section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16"><Container><CareerRoadmapExplorer levels={careerLevels} slugs={careerLevelContent.map(x=>x.slug)} /></Container></section></main><Footer /></>;
}
