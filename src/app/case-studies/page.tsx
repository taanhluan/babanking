import { CaseStudyCard } from '@/components/case-studies/CaseStudyCard';
import { CaseStudyLibrary } from '@/components/case-studies/CaseStudyLibrary';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { PageHero } from '@/components/layout/PageHero';
import { Container } from '@/components/ui/Container';
import { caseStudies } from '@/data/case-studies';
import { requirePremiumAccess } from '@/lib/membership';
import {getCurrentLocale} from '@/i18n/server'; import {TranslationUnavailable} from '@/components/content/TranslationUnavailable';

export default async function CaseStudiesPage() {
  await requirePremiumAccess('/case-studies');
  if(await getCurrentLocale()==='vi')return <TranslationUnavailable englishPath="/case-studies"/>;
  const featured = caseStudies.find((study) => study.featured) ?? caseStudies[0];
  return <><Navbar /><main><PageHero eyebrow="Knowledge and Case Studies" title="Practical Content for Real Banking BA Work" description="Explore focused resources connecting banking domain knowledge to requirement analysis, solution design, delivery, and career growth." current="Case Studies" /><section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16"><Container><div className="mb-12 grid gap-6 lg:grid-cols-[0.42fr_0.58fr] lg:items-center"><div><p className="text-sm font-semibold text-goldAccent">Featured Practice Case</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Start with a capability-led view</h2><p className="mt-3 leading-7 text-textSecondary">A practical example of connecting stakeholder needs to reusable banking capabilities and defensible solution decisions.</p></div><CaseStudyCard study={featured} /></div><CaseStudyLibrary studies={caseStudies} /></Container></section></main><Footer /></>;
}
