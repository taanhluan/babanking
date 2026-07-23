import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';

export function FinalCTASection() {
  return (
    <section className="px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
      <Container>
        <div className="rounded-[22px] border border-white/10 bg-navyBlue px-6 py-8 text-white shadow-soft sm:px-8 lg:px-10 lg:py-9">
          <Reveal className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Start Your Banking BA Journey</h2>
              <p className="mt-3 text-base leading-7 text-slate-300">Build stronger banking knowledge, improve practical BA capabilities, and create a clear direction for your professional growth.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/banking-journeys" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-royalBlue px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5">Explore Banking Knowledge</Link>
              <Link href="/career-roadmap" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white">View Career Roadmap</Link>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
