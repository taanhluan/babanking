import { notFound } from 'next/navigation';
import { Footer } from '@/components/layout/Footer'; import { Navbar } from '@/components/layout/Navbar'; import { Container } from '@/components/ui/Container';
import { ArticleLayout, Callout, ContentHero, ContentSection, JsonLd, List, PreviousNext, RelatedContent } from '@/components/content/Editorial';
import { baPracticeContent, bankingJourneyContent, careerLevelContent } from '@/data/content';
import { KnowledgeActions } from '@/components/member/KnowledgeActions';
import { requirePremiumAccess } from '@/lib/membership';
import {getCurrentLocale} from '@/i18n/server'; import {TranslationUnavailable} from '@/components/content/TranslationUnavailable';
export default async function CareerDetail({ params }: { params: Promise<{ slug: string }> }) {
 await requirePremiumAccess('/career-roadmap');
 if(await getCurrentLocale()==='vi')return <TranslationUnavailable englishPath={`/career-roadmap/${(await params).slug}`}/>;
 const { slug } = await params; const x = careerLevelContent.find((i) => i.slug === slug); if (!x) notFound();
 const practices = x.recommendedPracticeSlugs.flatMap((slug) => { const v = baPracticeContent.find((a) => a.slug === slug); return v ? [{ href: `/ba-practice/${v.slug}`, label: v.title, context: 'Recommended BA Practice' }] : []; });
 const journeys = x.recommendedJourneySlugs.flatMap((slug) => { const v = bankingJourneyContent.find((a) => a.slug === slug); return v ? [{ href: `/banking-journeys/${v.slug}`, label: v.title, context: 'Recommended Journey' }] : []; });
 const prev = careerLevelContent.find((v) => v.slug === x.previousLevelSlug), next = careerLevelContent.find((v) => v.slug === x.nextLevelSlug);
 const toc = [{ id: 'focus', label: 'Typical focus' }, { id: 'knowledge', label: 'Knowledge' }, { id: 'responsibility', label: 'Responsibilities' }, { id: 'readiness', label: 'Readiness' }, { id: 'development', label: 'Development areas' }, { id: 'related', label: 'Recommended knowledge' }];
 return <><Navbar /><main><JsonLd data={{ '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', name: x.title, description: x.summary }, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: '/' }, { '@type': 'ListItem', position: 2, name: 'Career Roadmap', item: '/career-roadmap' }, { '@type': 'ListItem', position: 3, name: x.title }] }] }} /><ContentHero eyebrow={`Career level ${x.level}`} title={x.title} summary={x.summary} parentLabel="Career Roadmap" parentHref="/career-roadmap" /><section className="px-4 py-12 sm:px-6 lg:px-8"><Container><KnowledgeActions type="CAREER_LEVEL" slug={x.slug} /><ArticleLayout toc={toc}>
 <Callout label="Typical expectations">Level names and responsibilities vary by organization. Use this page as a development guide, not a guaranteed promotion framework.</Callout>
 <ContentSection id="focus" title="Primary focus"><List items={x.primaryFocus} /></ContentSection>
 <ContentSection id="knowledge" title="Expected banking knowledge"><List items={x.bankingKnowledge} /></ContentSection>
 <ContentSection id="responsibility" title="Common responsibilities and deliverables"><div className="grid gap-6 sm:grid-cols-2"><div><h3 className="font-semibold text-textPrimary">Responsibilities</h3><List items={x.responsibilities} /></div><div><h3 className="font-semibold text-textPrimary">Expected deliverables</h3><List items={x.expectedDeliverables} /></div></div><h3 className="mt-6 font-semibold text-textPrimary">Stakeholder scope</h3><List items={x.stakeholderScope} /></ContentSection>
 <ContentSection id="readiness" title="Suggested readiness indicators"><List items={x.readinessIndicators} /></ContentSection>
 <ContentSection id="development" title="Recommended development areas"><List items={x.commonDevelopmentGaps} /></ContentSection>
 <div id="related" className="space-y-8"><RelatedContent title="Recommended BA practices" links={practices} /><RelatedContent title="Recommended banking journeys" links={journeys} /></div>
 <PreviousNext previous={prev ? { href: `/career-roadmap/${prev.slug}`, label: prev.title, context: '' } : undefined} next={next ? { href: `/career-roadmap/${next.slug}`, label: next.title, context: '' } : undefined} backHref="/career-roadmap" backLabel="Interactive roadmap" />
 </ArticleLayout></Container></section></main><Footer /></>;
}
