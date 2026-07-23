import { ArrowRight, Users } from 'lucide-react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';

const communityTerms = ['Knowledge Sharing Sessions', 'Domain Contributors', 'Practice Case Reviews', 'BA Experience Sharing', 'Community Articles'];

export function CommunitySection() {
  return (
    <section id="community" className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <Container>
        <div className="rounded-[22px] border border-white/10 bg-navyBlue px-6 py-8 text-white shadow-soft sm:px-8 lg:px-10 lg:py-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
            <Reveal className="max-w-xl">
              <p className="text-sm font-semibold tracking-[0.04em] text-goldLight">Knowledge Sharing Community</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Knowledge grows when experience is shared.</h2>
              <p className="mt-4 text-base leading-7 text-slate-300">Connect with Business Analysts and banking professionals to exchange practical knowledge, discuss real cases, and improve how banking requirements are analyzed and delivered.</p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-200">
                {communityTerms.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-2">{item}</span>
                ))}
              </div>
              <Link href="/case-studies" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-royalBlue px-5 py-3 text-sm font-semibold text-white">Explore Shared Practice <ArrowRight className="h-4 w-4" /></Link>
            </Reveal>

            <Reveal delay={80}>
              <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(18,39,75,0.95),rgba(11,24,45,0.95))] p-5">
                <div className="grid grid-cols-2 gap-3">
                  {communityTerms.map((item, index) => (
                    <div key={item} className="rounded-[1rem] border border-white/10 bg-white/5 p-3 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-cyanAccent/15 text-cyanAccent">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{index + 1}</div>
                      <div className="mt-1 text-sm font-semibold text-white">{item}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
