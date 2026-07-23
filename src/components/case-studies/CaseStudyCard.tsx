import Link from 'next/link';
import type { CaseStudy } from '@/data/case-studies';
import { CaseStudyVisual } from './CaseStudyVisual';

export function CaseStudyCard({ study }: { study: CaseStudy }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
      <CaseStudyVisual type={study.visual} />
      <div className="p-5">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
          <span>{study.contentType}</span><span aria-hidden="true">•</span><span>{study.domain}</span><span aria-hidden="true">•</span><span>{study.level}</span>
        </div>
        <h2 className="mt-3 text-xl font-semibold leading-7 text-textPrimary">{study.title}</h2>
        <p className="mt-2 text-sm leading-6 text-textSecondary">{study.summary}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">{study.readingTime}</span>
          <Link href={`/case-studies/${study.slug}`} className="font-semibold text-royalBlue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-royalBlue">Read case study</Link>
        </div>
      </div>
    </article>
  );
}
