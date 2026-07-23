import { notFound } from 'next/navigation';
import { Footer } from '@/components/layout/Footer'; import { Navbar } from '@/components/layout/Navbar'; import { Container } from '@/components/ui/Container';
import { ArticleLayout, Callout, ContentHero, ContentSection, JsonLd, List, PreviousNext, ProcessFlow, RelatedContent } from '@/components/content/Editorial';
import { baPracticeContent, bankingJourneyContent, caseStudyContent } from '@/data/content';
import { KnowledgeActions } from '@/components/member/KnowledgeActions';
import { requirePremiumAccess } from '@/lib/membership';
import {getCurrentLocale} from '@/i18n/server'; import {TranslationUnavailable} from '@/components/content/TranslationUnavailable';
export default async function PracticeDetail({ params }: { params: Promise<{ slug: string }> }) {
 await requirePremiumAccess('/ba-practice');
 if(await getCurrentLocale()==='vi')return <TranslationUnavailable englishPath={`/ba-practice/${(await params).slug}`}/>;
 const { slug } = await params; const x = baPracticeContent.find((i) => i.slug === slug); if (!x) notFound(); const i = baPracticeContent.indexOf(x), prev = baPracticeContent[i - 1], next = baPracticeContent[i + 1];
 const journeys = x.relatedJourneySlugs.flatMap((slug) => { const v = bankingJourneyContent.find((a) => a.slug === slug); return v ? [{ href: `/banking-journeys/${v.slug}`, label: v.title, context: 'Banking Journey' }] : []; });
 const cases = x.relatedCaseStudySlugs.flatMap((slug) => { const v = caseStudyContent.find((a) => a.slug === slug); return v ? [{ href: `/case-studies/${v.slug}`, label: v.title, context: 'Case Study' }] : []; });
 const related = x.relatedPracticeSlugs.flatMap((slug) => { const v = baPracticeContent.find((a) => a.slug === slug); return v ? [{ href: `/ba-practice/${v.slug}`, label: v.title, context: 'BA Practice' }] : []; });
 const toc = [{ id: 'purpose', label: 'Purpose and use' }, { id: 'activities', label: 'Activities' }, { id: 'outputs', label: 'Outputs and techniques' }, { id: 'example', label: 'Banking example' }, { id: 'quality', label: 'Quality checklist' }, { id: 'questions', label: 'BA questions' }, { id: 'related', label: 'Related knowledge' }];
 return <><Navbar /><main><JsonLd data={{ '@context': 'https://schema.org', '@graph': [{ '@type': 'TechArticle', headline: x.title, description: x.summary }, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: '/' }, { '@type': 'ListItem', position: 2, name: 'BA Practice', item: '/ba-practice' }, { '@type': 'ListItem', position: 3, name: x.title }] }] }} /><ContentHero eyebrow="Banking BA Practice" title={x.title} summary={x.summary} parentLabel="BA Practice" parentHref="/ba-practice" /><section className="px-4 py-12 sm:px-6 lg:px-8"><Container><KnowledgeActions type="BA_PRACTICE" slug={x.slug} /><ArticleLayout toc={toc}>
 <ContentSection id="purpose" title="Purpose and when to use it"><p>{x.purpose}</p><h3 className="mt-5 font-semibold text-textPrimary">When to use</h3><List items={x.whenToUse} /><h3 className="mt-5 font-semibold text-textPrimary">Required inputs</h3><List items={x.inputs} /></ContentSection>
 <ContentSection id="activities" title="Step-by-step activities"><ProcessFlow steps={x.activities} /></ContentSection>
 <ContentSection id="outputs" title="Outputs and recommended techniques"><div className="grid gap-6 sm:grid-cols-2"><div><h3 className="font-semibold text-textPrimary">Expected outputs</h3><List items={x.outputs} /></div><div><h3 className="font-semibold text-textPrimary">Techniques</h3><List items={x.techniques} /></div></div></ContentSection>
 <ContentSection id="example" title="Banking examples">{x.bankingExamples.map((example) => <Callout key={example.title} label={example.title}>{example.description}</Callout>)}<h3 className="mt-6 font-semibold text-textPrimary">Common mistakes</h3><List items={x.commonMistakes} /></ContentSection>
 <ContentSection id="quality" title="Quality checklist"><ul className="space-y-3">{x.qualityChecklist.map((item) => <li key={item} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3"><span aria-hidden="true">□</span>{item}</li>)}</ul></ContentSection>
 <ContentSection id="questions" title="Sample BA questions"><Callout label="BA questions"><List items={x.sampleQuestions} /></Callout></ContentSection>
 <div id="related" className="space-y-8"><RelatedContent title="Useful banking journeys" links={journeys} /><RelatedContent title="Related case studies" links={cases} /><RelatedContent title="Related practices" links={related} /></div>
 <PreviousNext previous={prev ? { href: `/ba-practice/${prev.slug}`, label: prev.title, context: '' } : undefined} next={next ? { href: `/ba-practice/${next.slug}`, label: next.title, context: '' } : undefined} backHref="/ba-practice" backLabel="BA Practice overview" />
 </ArticleLayout></Container></section></main><Footer /></>;
}
