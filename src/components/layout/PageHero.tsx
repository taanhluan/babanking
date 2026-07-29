import Link from 'next/link';
import { Container } from '@/components/ui/Container';

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  current: string;
}

export function PageHero({ eyebrow, title, description, current }: PageHeroProps) {
  return (
    <section className="bg-navy px-4 py-14 text-white sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <Container>
        <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-400">
          <Link href="/" className="rounded-sm transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-goldLight">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-slate-200">{current}</span>
        </nav>
        <p className="text-sm font-semibold tracking-[0.04em] text-goldLight">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">{description}</p>
      </Container>
    </section>
  );
}
