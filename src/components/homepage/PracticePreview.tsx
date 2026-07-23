import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';

const stages = [
  { name: 'Understand', items: ['Business Context', 'Customer Journey', 'Business Process'] },
  { name: 'Analyze', items: ['Business Rules', 'Requirement Analysis', 'Gap Analysis'] },
  { name: 'Recommend', items: ['Solution Recommendation', 'Impact Assessment', 'Prioritization'] },
  { name: 'Deliver', items: ['BRD', 'User Stories', 'Acceptance Criteria', 'Workflow', 'Wireframe', 'Data Dictionary'] },
];

export function PracticePreview() {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
      <Container>
        <div className="rounded-[22px] bg-navyBlue p-6 text-white sm:p-8 lg:p-10">
          <p className="text-sm font-semibold text-goldLight">BA Practice Framework</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From context to professional BA delivery</h2>
          <div className="relative mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div aria-hidden="true" className="absolute left-[8%] right-[8%] top-6 hidden h-px bg-goldAccent/35 lg:block" />
            {stages.map((stage, index) => <div key={stage.name} className="relative rounded-2xl border border-white/10 bg-white/5 p-4"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-goldAccent text-sm font-semibold text-navy">{index + 1}</span><h3 className="mt-4 font-semibold">{stage.name}</h3><ul className="mt-3 space-y-1.5 text-sm text-slate-300">{stage.items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}
          </div>
          <Link href="/ba-practice" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-royalBlue px-5 py-3 text-sm font-semibold text-white">Explore the BA Practice Framework <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </Container>
    </section>
  );
}
