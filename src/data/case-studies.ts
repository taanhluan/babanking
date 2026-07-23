export type ContentType = 'Banking Case Study' | 'Banking Journey' | 'BA Practice Guide' | 'Capability Mapping' | 'Career Insight';
export type BaLevel = 'Foundation' | 'Intermediate' | 'Advanced';
export type VisualType = 'matrix' | 'payment' | 'document' | 'onboarding' | 'gap' | 'rules';

export interface CaseStudy {
  slug: string;
  title: string;
  summary: string;
  contentType: ContentType;
  domain: string;
  level: BaLevel;
  readingTime: string;
  featured: boolean;
  topics: string[];
  visual: VisualType;
}

export const caseStudies: CaseStudy[] = [
  { slug: 'mapping-business-requirements-to-capabilities', title: 'Mapping Business Requirements to Banking Capabilities', summary: 'Evaluate requirement coverage, adaptability, gaps, and recommended solutions across banking functions.', contentType: 'Capability Mapping', domain: 'Cross-domain', level: 'Intermediate', readingTime: '8 min read', featured: true, topics: ['capabilities', 'requirements', 'gap analysis'], visual: 'matrix' },
  { slug: 'understanding-payment-journey', title: 'Understanding the Payment Journey', summary: 'Follow initiation, validation, authorization, execution, settlement, and notification in a modern payment flow.', contentType: 'Banking Journey', domain: 'Payments', level: 'Foundation', readingTime: '6 min read', featured: true, topics: ['payments', 'workflow', 'status model'], visual: 'payment' },
  { slug: 'requirement-notes-to-brd', title: 'From Requirement Notes to BRD', summary: 'Turn unstructured stakeholder input into a clear, reviewable, and traceable requirements document.', contentType: 'BA Practice Guide', domain: 'Cross-domain', level: 'Foundation', readingTime: '7 min read', featured: true, topics: ['BRD', 'discovery', 'documentation'], visual: 'document' },
  { slug: 'digital-onboarding-journey', title: 'Designing a Digital Onboarding Journey', summary: 'Shape identity verification, KYC, consent, exception handling, and account opening into one coherent journey.', contentType: 'Banking Case Study', domain: 'Onboarding', level: 'Intermediate', readingTime: '9 min read', featured: false, topics: ['KYC', 'onboarding', 'customer journey'], visual: 'onboarding' },
  { slug: 'conducting-fit-gap-analysis', title: 'Conducting a Fit-Gap Analysis', summary: 'Compare business requirements with platform capabilities and define an evidence-based disposition for each gap.', contentType: 'BA Practice Guide', domain: 'Cards', level: 'Advanced', readingTime: '10 min read', featured: false, topics: ['fit-gap', 'solution options', 'capability coverage'], visual: 'gap' },
  { slug: 'payment-limits-business-rules', title: 'Mapping Business Rules for Payment Limits', summary: 'Structure channel, customer, currency, frequency, and risk conditions into testable payment-limit rules.', contentType: 'Banking Case Study', domain: 'Payments', level: 'Intermediate', readingTime: '8 min read', featured: false, topics: ['business rules', 'payment limits', 'decision table'], visual: 'rules' },
];
