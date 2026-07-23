import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { careerLevels } from '@/data/career-roadmap';
import { Container } from '@/components/ui/Container';

export function CareerRoadmapPreview() {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
      <Container>
        <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-royalBlue">Career Roadmap Preview</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-textPrimary">Grow from foundation to domain leadership</h2>
          <p className="mt-3 max-w-3xl leading-7 text-textSecondary">Banking knowledge, analytical ownership, stakeholder influence, and delivery responsibility expand together throughout a BA career.</p>
          <ol className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">{careerLevels.map((level, index) => <li key={level.id} className={`relative rounded-xl border p-3 text-sm font-semibold ${index === 2 ? 'border-goldAccent bg-goldPale text-navy' : 'border-slate-200 bg-slate-50 text-slate-600'}`}><span className="block text-xs font-medium opacity-70">{index + 1}</span><span className="mt-1 block">{level.shortName}</span>{index < careerLevels.length - 1 ? <ArrowRight aria-hidden="true" className="absolute -right-3 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-slate-400 lg:block" /> : null}</li>)}</ol>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/career-roadmap" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-royalBlue px-5 py-3 text-sm font-semibold text-white">View Full Career Roadmap <ArrowRight className="h-4 w-4" /></Link><Link href="/career-roadmap/middle-ba" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-navy">Explore Middle BA</Link></div>
        </div>
      </Container>
    </section>
  );
}
