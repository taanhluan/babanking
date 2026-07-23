export interface PracticeStage {
  id: string;
  name: string;
  items: string[];
  summary: string;
}

export interface PracticeArea {
  name: string;
  purpose: string;
  inputs: string[];
  activities: string[];
  outputs: string[];
  mistakes: string[];
}

export const practiceStages: PracticeStage[] = [
  { id: 'discover', name: 'Discover', items: ['Business Context', 'Customer Journey', 'Stakeholders'], summary: 'Establish why the change matters, who is affected, and which outcome is expected.' },
  { id: 'understand', name: 'Understand', items: ['Business Process', 'Business Rules', 'Data and Systems'], summary: 'Build a shared view of the current operation, decisions, information, and technology.' },
  { id: 'analyze', name: 'Analyze', items: ['Requirement Analysis', 'Gap Analysis', 'Impact Assessment'], summary: 'Translate needs into structured requirements and identify coverage, gaps, and impacts.' },
  { id: 'recommend', name: 'Recommend', items: ['Solution Options', 'Solution Recommendation', 'Prioritization'], summary: 'Compare viable options and recommend a path aligned to value, risk, and feasibility.' },
  { id: 'deliver', name: 'Deliver', items: ['BRD', 'User Stories', 'Acceptance Criteria', 'Workflow', 'Wireframe', 'Data Dictionary', 'Traceability', 'Gap Analysis'], summary: 'Produce clear, traceable artifacts that enable design, build, test, and release.' },
];

const area = (name: string, purpose: string, inputs: string[], activities: string[], outputs: string[], mistakes: string[]): PracticeArea =>
  ({ name, purpose, inputs, activities, outputs, mistakes });

export const practiceAreas: PracticeArea[] = [
  area('Requirement Discovery', 'Reveal the business problem, desired outcome, constraints, and stakeholder needs.', ['Business objective', 'Stakeholder context'], ['Interviews', 'Workshops', 'Observation'], ['Discovery notes', 'Scope and outcomes'], ['Starting with a preferred solution', 'Missing operational stakeholders']),
  area('Business Process Mapping', 'Make activities, handoffs, decisions, and exceptions visible.', ['Journey context', 'Policies', 'SME input'], ['Map current state', 'Validate exceptions'], ['Current and future workflows'], ['Mapping only the happy path', 'Mixing process with system design']),
  area('Business Rules Definition', 'Express decisions and constraints in testable, governed language.', ['Policies', 'Product rules', 'Controls'], ['Identify conditions', 'Resolve conflicts'], ['Rule catalogue', 'Decision table'], ['Embedding rules only in prose', 'Missing rule ownership']),
  area('Capability Mapping', 'Connect business needs to stable banking capabilities.', ['Requirements', 'Capability model'], ['Map coverage', 'Identify overlap'], ['Capability mapping', 'Coverage view'], ['Mapping to screens instead of capabilities', 'Ignoring ownership']),
  area('Fit-Gap Analysis', 'Assess where an existing product or solution meets the business need.', ['Requirements', 'Solution capabilities'], ['Score fit', 'Describe gaps', 'Assess options'], ['Fit-gap matrix', 'Gap disposition'], ['Treating partial fit as full fit', 'No evidence for scoring']),
  area('Impact Assessment', 'Identify operational, customer, system, data, control, and delivery impacts.', ['Proposed change', 'Current architecture'], ['Trace dependencies', 'Assess risk'], ['Impact register', 'Dependency map'], ['Only assessing the primary system', 'Missing downstream operations']),
  area('Solution Recommendation', 'Select a defensible solution based on value, risk, cost, and feasibility.', ['Options', 'Gap analysis', 'Constraints'], ['Compare options', 'Document trade-offs'], ['Recommendation', 'Decision record'], ['Hiding trade-offs', 'No decision criteria']),
  area('Stakeholder Alignment', 'Build shared understanding and obtain timely decisions.', ['Analysis outputs', 'Stakeholder map'], ['Playback findings', 'Resolve conflicts'], ['Agreed decisions', 'Action log'], ['Seeking consensus on every detail', 'Unclear decision owner']),
  area('BA Documentation', 'Create usable and traceable artifacts for delivery and governance.', ['Validated analysis', 'Templates'], ['Structure content', 'Review quality'], ['BRD', 'Stories', 'Acceptance criteria', 'Traceability'], ['Duplicating conflicting requirements', 'Writing without an audience']),
];
