import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';

export function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden bg-navy px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(110deg,#071426_0%,#0B1F3A_62%,#123057_100%)]" />
      <Container className="relative grid min-h-[620px] items-center gap-10 py-12 md:py-16 lg:min-h-[650px] lg:grid-cols-[1.04fr_0.96fr] lg:gap-14 lg:py-10">
        <Reveal className="max-w-2xl">
          <p className="mb-5 text-sm font-semibold tracking-[0.04em] text-goldLight">
            Banking Domain Knowledge for Business Analysts
          </p>
          <h1 className="text-[2.6rem] font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl lg:text-[3.5rem]">
            Understand Banking.
            <span className="mt-1 block text-goldLight">Grow as a Business Analyst.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
            Explore practical banking knowledge, real Business Analyst experience, project case studies, and a clear direction for your professional growth.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/banking-journeys" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-royalBlue px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700">
              Explore Banking Knowledge <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/career-roadmap" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-goldAccent/70 hover:text-goldLight">
              View BA Career Roadmap
            </Link>
          </div>
        </Reveal>

        <Reveal className="relative mx-auto w-full max-w-[590px]" delay={120}>
          <div className="relative overflow-hidden rounded-[22px] border border-white/10 shadow-[0_28px_70px_rgba(2,8,20,0.35)]">
            <Image
              src="/images/banking-ba-hero.svg"
              alt="Banking knowledge and Business Analyst practice illustration"
              width={1200}
              height={900}
              priority
              className="h-auto w-full"
              sizes="(max-width: 1024px) 92vw, 46vw"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-navy/20 via-transparent to-navyMid/10" />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
