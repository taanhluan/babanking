import Link from 'next/link';
import { caseStudies } from '@/data/case-studies';
import { CaseStudyCard } from '@/components/case-studies/CaseStudyCard';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';

export function FeaturedCaseStudies() {
  const featured = caseStudies.filter((study) => study.featured);
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
      <Container>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><SectionHeading eyebrow="Featured Case Studies" title="Learn from practical Banking BA work" description="Focused examples connecting domain knowledge, analysis, and delivery decisions." /><Link href="/case-studies" className="shrink-0 font-semibold text-royalBlue">View All Case Studies</Link></div>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">{featured.map((study) => <CaseStudyCard key={study.slug} study={study} />)}</div>
      </Container>
    </section>
  );
}
