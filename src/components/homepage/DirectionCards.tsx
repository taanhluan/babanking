import { ArrowRight, BriefcaseBusiness, Landmark, Library, Route } from 'lucide-react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';

const directions = [
  { title: 'Explore Banking Domain', description: 'Understand banking products, customer journeys, business rules, systems, controls, and operational processes.', cta: 'Explore Banking Journeys', href: '/banking-journeys', icon: Landmark },
  { title: 'Improve BA Practice', description: 'Apply requirement discovery, business process mapping, gap analysis, business rules, solution recommendations, and professional BA documentation.', cta: 'Explore BA Practice', href: '/ba-practice', icon: BriefcaseBusiness },
  { title: 'Learn from Real Cases', description: 'Review practical banking requirements, capability mapping, workflow design, implementation gaps, and solution recommendations.', cta: 'View Case Studies', href: '/case-studies', icon: Library },
  { title: 'Build Your Career Roadmap', description: 'Understand the banking knowledge, responsibilities, deliverables, and progression expected at each Business Analyst level.', cta: 'View Career Roadmap', href: '/career-roadmap', icon: Route },
] as const;

export function DirectionCards() {
  return (
    <section aria-labelledby="directions-title" className="px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
      <Container>
        <div className="max-w-3xl"><p className="text-sm font-semibold text-royalBlue">Choose your knowledge journey</p><h2 id="directions-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Four paths for stronger Banking BA practice</h2></div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {directions.map(({ icon: Icon, ...direction }, index) => (
            <Link key={direction.href} href={direction.href} className="group flex min-h-64 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-royalBlue/40 hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-royalBlue">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${index === 0 ? 'bg-goldPale text-navyMid' : 'bg-blue-50 text-royalBlue'}`}><Icon aria-hidden="true" className="h-5 w-5" /></div>
              <h3 className="mt-5 text-xl font-semibold text-textPrimary">{direction.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-textSecondary">{direction.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-royalBlue">{direction.cta}<ArrowRight aria-hidden="true" className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
