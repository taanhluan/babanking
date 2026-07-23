import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { bankingJourneys, featuredJourneyIds } from '@/data/banking-journeys';
import { bankingJourneyContent } from '@/data/content';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';

export function FeaturedJourneys() {
  const featured = featuredJourneyIds.map((id) => bankingJourneys.find((journey) => journey.id === id)).filter((journey): journey is NonNullable<typeof journey> => Boolean(journey));
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
      <Container>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><SectionHeading eyebrow="Featured Banking Journeys" title="Understand how banking services work" description="Start with four essential journeys, then explore the full domain catalogue." /><Link href="/banking-journeys" className="shrink-0 font-semibold text-royalBlue">View All Banking Journeys</Link></div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featured.map((journey) => {
            const slug = bankingJourneyContent.find((item) => item.title === journey.name)?.slug;
            return <article key={journey.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-500">{journey.category}</p><h3 className="mt-2 text-lg font-semibold">{journey.name}</h3><p className="mt-2 text-sm leading-6 text-textSecondary">{journey.description}</p><ul className="mt-4 flex flex-wrap gap-2">{journey.capabilities.slice(0, 2).map((item) => <li key={item} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">{item}</li>)}</ul><Link href={slug ? `/banking-journeys/${slug}` : '/banking-journeys'} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-royalBlue">Explore journey <ArrowRight className="h-4 w-4" /></Link></article>;
          })}
        </div>
      </Container>
    </section>
  );
}
