'use client';

import Link from 'next/link';
import { ArrowDownRight } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';

type ScrollChapterItem = {
  title: string;
  copy: string;
};

type ScrollChapterProps = {
  id: string;
  eyebrow: string;
  title: string;
  copy?: string;
  items: ScrollChapterItem[];
  locale: string;
  actionLabel?: string;
  tone?: 'light' | 'dark';
};

export function ScrollChapter({ id, eyebrow, title, copy, items, locale, actionLabel, tone = 'light' }: ScrollChapterProps) {
  const dark = tone === 'dark';

  return (
    <section id={id} className={dark ? 'bg-navy px-4 py-20 text-white sm:px-6 lg:py-28' : 'bg-white px-4 py-20 sm:px-6 lg:py-28'}>
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(280px,.72fr)_minmax(0,1.28fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal>
            <p className={dark ? 'text-sm font-semibold text-goldLight' : 'text-sm font-semibold text-royalBlue'}>{eyebrow}</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
            {copy ? <p className={dark ? 'mt-5 max-w-md leading-7 text-slate-300' : 'mt-5 max-w-md leading-7 text-textSecondary'}>{copy}</p> : null}
            <p className={dark ? 'mt-8 hidden items-center gap-2 text-sm text-goldLight lg:flex' : 'mt-8 hidden items-center gap-2 text-sm text-royalBlue lg:flex'}>Scroll through the chapter <ArrowDownRight className="h-4 w-4" /></p>
          </Reveal>
        </div>

        <div className="space-y-5 lg:space-y-10">
          {items.map((item, index) => (
            <Reveal key={item.title} delay={index * 90}>
              <article className={dark ? 'group min-h-56 rounded-3xl border border-white/15 bg-white/5 p-7 sm:p-9 lg:min-h-[52vh] lg:p-10' : 'group min-h-56 rounded-3xl border border-slate-200 bg-bgLight p-7 sm:p-9 lg:min-h-[52vh] lg:p-10'}>
                <span className={dark ? 'text-sm font-semibold tracking-[.18em] text-goldLight' : 'text-sm font-semibold tracking-[.18em] text-goldAccent'}>0{index + 1}</span>
                <div className="mt-10 max-w-xl lg:mt-20">
                  <h3 className="text-2xl font-semibold sm:text-4xl">{item.title}</h3>
                  <p className={dark ? 'mt-5 max-w-lg text-lg leading-8 text-slate-300' : 'mt-5 max-w-lg text-lg leading-8 text-textSecondary'}>{item.copy}</p>
                  {actionLabel ? <Link href={`/${locale}/request-access`} className={dark ? 'mt-8 inline-flex items-center gap-2 font-semibold text-goldLight' : 'mt-8 inline-flex items-center gap-2 font-semibold text-royalBlue'}>{actionLabel}<ArrowDownRight className="h-4 w-4" /></Link> : null}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
