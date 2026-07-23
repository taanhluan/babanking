import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { PageHero } from '@/components/layout/PageHero';
import { Container } from '@/components/ui/Container';
import { practiceAreas, practiceStages } from '@/data/ba-practice';
import { baPracticeContent } from '@/data/content';
import { requirePremiumAccess } from '@/lib/membership';
import {getCurrentLocale} from '@/i18n/server'; import {TranslationUnavailable} from '@/components/content/TranslationUnavailable';

export default async function BaPracticePage() {
  await requirePremiumAccess('/ba-practice');
  if(await getCurrentLocale()==='vi')return <TranslationUnavailable englishPath="/ba-practice"/>;
  return <><Navbar /><main><PageHero eyebrow="Banking BA Practice" title="Turn Banking Knowledge into BA Delivery" description="Follow a structured approach from business context and customer journeys to gap analysis, solution recommendations, and professional BA artifacts." current="BA Practice" />
    <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16"><Container>
      <div className="relative grid gap-4 lg:grid-cols-5"><div aria-hidden="true" className="absolute left-[8%] right-[8%] top-6 hidden h-px bg-goldAccent/40 lg:block" />{practiceStages.map((stage, index) => <article key={stage.id} className="relative rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-goldAccent text-sm font-semibold text-navy">{index + 1}</span><h2 className="mt-4 text-xl font-semibold">{stage.name}</h2><p className="mt-2 text-sm leading-6 text-textSecondary">{stage.summary}</p><ul className="mt-4 space-y-2 text-sm text-slate-700">{stage.items.map((item) => <li key={item}>• {item}</li>)}</ul></article>)}</div>
      <section className="mt-16"><p className="text-sm font-semibold text-royalBlue">Practice Areas</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Apply the framework to real analysis work</h2><div className="mt-7 divide-y divide-slate-200 rounded-[20px] border border-slate-200 bg-white px-5 sm:px-7">{practiceAreas.map((area) => <details key={area.name} className="group py-5"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-textPrimary focus-visible:outline focus-visible:outline-2 focus-visible:outline-royalBlue">{area.name}<span aria-hidden="true" className="text-xl text-royalBlue group-open:rotate-45">+</span></summary><div className="grid gap-5 pb-2 pt-4 text-sm leading-6 text-textSecondary sm:grid-cols-2 lg:grid-cols-5"><Info title="Purpose" text={area.purpose} /><Info title="Inputs" items={area.inputs} /><Info title="Activities" items={area.activities} /><Info title="Outputs" items={area.outputs} /><Info title="Common mistakes" items={area.mistakes} /></div></details>)}</div></section>
      <nav aria-label="BA practice guides" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{baPracticeContent.map((practice) => <Link key={practice.slug} href={`/ba-practice/${practice.slug}`} className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-royalBlue">{practice.title}</Link>)}</nav>
    </Container></section></main><Footer /></>;
}

function Info({ title, text, items }: { title: string; text?: string; items?: string[] }) {
  return <div><h3 className="font-semibold text-textPrimary">{title}</h3>{text ? <p className="mt-2">{text}</p> : <ul className="mt-2 space-y-1">{items?.map((item) => <li key={item}>• {item}</li>)}</ul>}</div>;
}
