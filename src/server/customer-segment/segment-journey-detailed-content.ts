import { journeyContentSchema, type JourneyContent } from '@/server/cms/journey-content-schema';
import type { SegmentJourneyBlueprint } from './segment-journey-blueprints';

type Capability = 'onboarding' | 'accounts' | 'payments' | 'liquidity' | 'lending' | 'trade' | 'cards' | 'service' | 'security' | 'notifications';
type Template = {
  actors: readonly string[];
  systems: readonly string[];
  data: readonly string[];
  rules: readonly string[];
  exceptions: readonly string[];
  risks: readonly string[];
  outcomes: readonly string[];
  kpis: readonly string[];
  discovery: readonly string[];
};

const templates: Record<Capability, Template> = {
  onboarding: {
    actors: ['Business applicant / authorized representative', 'Relationship or onboarding manager', 'KYC/KYB and financial-crime operations', 'Account and channel operations'],
    systems: ['CRM and lead management', 'Digital onboarding and document capture', 'KYC/KYB, screening and risk engines', 'Core banking and digital-channel administration'],
    data: ['Legal entity, registration and licenses', 'Ownership, controllers and beneficial owners', 'Authorized signatories, mandates and users', 'Risk rating, screening evidence and account setup'],
    rules: ['The legal entity and authority to act must be verified.', 'Beneficial owners and controllers must be identified to the required threshold.', 'Screening and risk decisions require retained evidence.', 'Account and channel activation follows approval and mandatory-document completion.'],
    exceptions: ['Incomplete or inconsistent corporate documents', 'Complex or opaque ownership structure', 'Screening alert or enhanced-due-diligence requirement', 'Mandate, authority or activation failure'],
    risks: ['Impersonation or unauthorized application', 'Sanctions, AML or adverse-media exposure', 'Incorrect entity or ownership classification', 'Premature account or channel activation'],
    outcomes: ['Approved and identified business relationship', 'Correct account, mandate and user structure', 'Traceable risk decision and evidence', 'Controlled activation with review schedule'],
    kpis: ['Time to onboarding decision', 'First-time-right document rate', 'Manual review and abandonment rate', 'Activation and early-life exception rate'],
    discovery: ['Which entities, owners and controllers are in scope?', 'Which products, currencies, users and mandates are required?', 'What ownership, geographic or industry risks require enhanced review?', 'What channels and integrations must be ready at activation?'],
  },
  accounts: {
    actors: ['Business or corporate treasury customer', 'Relationship and product manager', 'Deposit and account operations', 'Finance, compliance and servicing teams'],
    systems: ['Core banking deposit platform', 'Pricing and product catalog', 'Mandate and entitlement management', 'Statements, reporting and general ledger'],
    data: ['Account hierarchy, currency and ownership', 'Product, pricing and interest terms', 'Mandates, limits and authorized users', 'Balances, transactions, statements and maturity instructions'],
    rules: ['Product and currency eligibility must be confirmed.', 'Pricing and exceptions require delegated approval.', 'Account ownership and mandates must remain consistent with KYC records.', 'Maturity, dormancy and closure follow notice and control requirements.'],
    exceptions: ['Funding or account-opening condition not met', 'Pricing exception or incorrect interest setup', 'Mandate conflict or unauthorized instruction', 'Dormancy, hold, maturity or closure dispute'],
    risks: ['Incorrect product or account structure', 'Unauthorized account operation', 'Interest, fee or tax miscalculation', 'Unreconciled closure or residual balance'],
    outcomes: ['Fit-for-purpose operating and deposit structure', 'Accurate pricing, interest and statements', 'Controlled mandates and servicing', 'Orderly maturity, renewal or closure'],
    kpis: ['Account setup turnaround time', 'Pricing and interest accuracy', 'Service-request first-time-right rate', 'Deposit retention and balance stability'],
    discovery: ['How should accounts be organized across entities and currencies?', 'What liquidity, yield and access requirements apply?', 'Who may operate, approve and view each account?', 'What reporting, statements and integration formats are required?'],
  },
  payments: {
    actors: ['Business finance or treasury user', 'Payment operations and investigations', 'Channel, clearing and settlement providers', 'Fraud, compliance and reconciliation teams'],
    systems: ['Digital banking, host-to-host or API channel', 'Payment hub and routing engine', 'Clearing, settlement and sanctions screening', 'Reconciliation, receivables and general ledger'],
    data: ['Payer, beneficiary and account details', 'Amount, currency, purpose and execution date', 'Authorization, limit and screening result', 'Clearing, settlement and reconciliation status'],
    rules: ['The instruction must satisfy mandate, limit and approval policy.', 'Required beneficiary and payment-purpose data must be complete.', 'Screening and fraud controls apply before release.', 'Final status and reconciliation evidence must be traceable.'],
    exceptions: ['Invalid or duplicate instruction', 'Approval, limit or funding failure', 'Screening, fraud or routing hold', 'Rejected, returned or unreconciled settlement'],
    risks: ['Unauthorized or fraudulent payment', 'Duplicate, delayed or misrouted settlement', 'Sanctions or regulatory breach', 'Incorrect collection matching or financial posting'],
    outcomes: ['Authorized and traceable transaction processing', 'Timely beneficiary or merchant settlement', 'Accurate collection matching and reconciliation', 'Controlled exception and investigation handling'],
    kpis: ['Straight-through-processing rate', 'On-time settlement rate', 'Return and repair rate', 'Automatic reconciliation rate'],
    discovery: ['Which payment and collection flows, currencies and volumes matter most?', 'What user, approval, limit and cut-off controls apply?', 'Which channels, files, APIs and clearing rails are required?', 'How are settlement, reconciliation and exceptions managed today?'],
  },
  liquidity: {
    actors: ['Treasurer, finance manager or business owner', 'Cash-management relationship and product teams', 'Account and liquidity operations', 'Risk, finance and reporting teams'],
    systems: ['Cash-position and treasury workstation', 'Core accounts and intraday balance feeds', 'Liquidity forecasting and analytics', 'Sweeping, pooling and investment platforms'],
    data: ['Entity and account balance positions', 'Receivables, payables and forecast cash flows', 'Liquidity targets, buffers and limits', 'Sweep, pool, investment and funding instructions'],
    rules: ['Only eligible accounts and entities may participate in a structure.', 'Sweeps, pools and transfers must follow authority and legal constraints.', 'Forecast assumptions and liquidity thresholds require ownership.', 'Investment and funding actions follow approved limits and counterparties.'],
    exceptions: ['Missing or delayed balance data', 'Forecast variance or unexpected cash shortfall', 'Sweep, pool or intercompany-transfer failure', 'Limit, market or counterparty restriction'],
    risks: ['Insufficient liquidity or trapped cash', 'Incorrect forecast or concentration position', 'Unauthorized intercompany movement', 'Market, counterparty or operational loss'],
    outcomes: ['Reliable cash visibility and forecast', 'Appropriate liquidity buffer and concentration', 'Efficient surplus investment and shortfall funding', 'Early warning and controlled treasury action'],
    kpis: ['Cash visibility coverage', 'Forecast accuracy', 'Idle-cash and borrowing reduction', 'Sweep and concentration success rate'],
    discovery: ['Where is cash held across accounts, entities and currencies?', 'What forecast horizon, buffer and concentration rules apply?', 'Which legal, tax and cross-border constraints exist?', 'How are surplus, shortfall and intraday events managed?'],
  },
  lending: {
    actors: ['Business borrower and authorized representatives', 'Relationship manager and credit analyst', 'Credit approval, legal and collateral teams', 'Loan operations, monitoring and collections'],
    systems: ['Loan origination and workflow', 'Credit decisioning and financial analysis', 'Collateral, documentation and covenant management', 'Loan servicing, limits and collections'],
    data: ['Borrower, group and ownership profile', 'Financial statements, cash flow and projections', 'Facility, pricing, security and covenant terms', 'Drawdown, utilization, repayment and monitoring evidence'],
    rules: ['Purpose, repayment source and affordability must be evidenced.', 'Exposure, limits and related-party positions must be consolidated.', 'Approval conditions and security must be satisfied before drawdown.', 'Covenants and early-warning indicators require ongoing monitoring.'],
    exceptions: ['Incomplete financial or ownership information', 'Policy exception or insufficient repayment capacity', 'Security, documentation or condition-precedent gap', 'Covenant breach, arrears or deterioration'],
    risks: ['Credit loss or misjudged repayment capacity', 'Incorrect group exposure or limit usage', 'Defective documentation or unenforceable security', 'Late identification of deterioration or default'],
    outcomes: ['Suitable and risk-adjusted facility structure', 'Documented independent credit decision', 'Controlled contracting and drawdown', 'Proactive monitoring, repayment and resolution'],
    kpis: ['Application-to-decision time', 'Approval and drawdown conversion', 'Covenant and review completion', 'Delinquency, default and recovery performance'],
    discovery: ['What amount, purpose, tenor and repayment source are required?', 'How do operating cycle, seasonality and downside scenarios affect capacity?', 'What security, guarantees, covenants and conditions are appropriate?', 'How will utilization, performance and early-warning signals be monitored?'],
  },
  trade: {
    actors: ['Importer, exporter, buyer or supplier', 'Trade sales and relationship teams', 'Trade operations and document examiners', 'Credit, compliance, correspondent and FX teams'],
    systems: ['Trade-finance processing platform', 'Document capture and examination', 'Sanctions, AML and trade screening', 'SWIFT, correspondent, FX and settlement systems'],
    data: ['Trade parties, goods, routes and countries', 'Instrument, amount, currency and terms', 'Commercial and transport documents', 'Limits, screening, discrepancy and settlement records'],
    rules: ['The applicant, counterparties, goods and countries must be eligible.', 'Instrument issuance requires limit and approval availability.', 'Documents are examined against applicable terms and rules.', 'Discrepancies, sanctions alerts and claims require controlled disposition.'],
    exceptions: ['Missing, late or discrepant documents', 'Insufficient facility or limit', 'Sanctions, dual-use-goods or country-risk alert', 'Non-payment, claim or correspondent failure'],
    risks: ['Documentary, performance or counterparty risk', 'Sanctions, AML or trade-based-finance risk', 'Country, currency or settlement risk', 'Operational error in instrument or document handling'],
    outcomes: ['Appropriate trade instrument and financing', 'Compliant issuance and document handling', 'Controlled FX and cross-border settlement', 'Traceable discrepancy, claim and closure handling'],
    kpis: ['Issuance turnaround time', 'Document discrepancy rate', 'Trade straight-through-processing rate', 'Claim, overdue and settlement performance'],
    discovery: ['What goods, corridors, counterparties and Incoterms are involved?', 'Which instruments, financing and guarantees reduce the key risks?', 'What currencies, FX exposures and settlement timing apply?', 'Which document, compliance and limit constraints must be managed?'],
  },
  cards: {
    actors: ['Program owner and company administrator', 'Cardholder or purchasing user', 'Card product, authorization and operations teams', 'Fraud, dispute, finance and expense-management teams'],
    systems: ['Card management and processing', 'Authorization, limits and fraud engines', 'Digital channel and card controls', 'Expense, reconciliation and general ledger integration'],
    data: ['Company, program and cardholder profile', 'Card type, limit and merchant controls', 'Authorization, clearing and transaction data', 'Receipt, expense, dispute and settlement evidence'],
    rules: ['Card issuance requires eligible company and authorized user.', 'Limits and merchant controls follow company policy.', 'Authorization uses card status, available limit and risk controls.', 'Disputes and expense evidence follow scheme and company timelines.'],
    exceptions: ['Card or user provisioning failure', 'Declined or suspicious authorization', 'Missing receipt or unmatched expense', 'Lost card, dispute or unauthorized transaction'],
    risks: ['Unauthorized employee or supplier spend', 'Card fraud or account compromise', 'Incorrect expense or ledger classification', 'Late dispute or unresolved reconciliation'],
    outcomes: ['Controlled card program and user setup', 'Convenient policy-compliant spending', 'Timely expense visibility and reconciliation', 'Effective fraud, dispute and lifecycle management'],
    kpis: ['Issuance and activation time', 'Authorization approval/decline quality', 'Expense auto-match rate', 'Fraud and dispute loss rate'],
    discovery: ['Which users, use cases and card products are required?', 'What limits, merchants, geographies and approval controls apply?', 'How should transactions integrate with expense and finance systems?', 'How are exceptions, disputes and card lifecycle events managed?'],
  },
  service: {
    actors: ['Business customer and authorized users', 'Relationship and service managers', 'Operations and specialist fulfillment teams', 'Complaint, quality and escalation owners'],
    systems: ['CRM and case management', 'Authentication and interaction channels', 'Workflow, knowledge and service catalog', 'Complaint, SLA and customer-feedback analytics'],
    data: ['Customer, relationship and authority context', 'Interaction, request and case details', 'Classification, priority, SLA and ownership', 'Resolution, communication and feedback evidence'],
    rules: ['The requester and authority must be authenticated.', 'Requests are classified and routed by service, impact and priority.', 'SLA, communication and escalation requirements must be monitored.', 'Complaints and redress follow approved governance.'],
    exceptions: ['Authentication or authority cannot be confirmed', 'Misrouted, duplicate or incomplete request', 'Dependency, outage or SLA breach', 'Complaint escalation or disputed resolution'],
    risks: ['Unauthorized disclosure or service action', 'Missed SLA or poor coordination', 'Inconsistent resolution or customer detriment', 'Weak complaint governance or recurring root cause'],
    outcomes: ['Secure and convenient service access', 'Clear ownership and coordinated fulfillment', 'Transparent communication and escalation', 'Measured service quality and relationship improvement'],
    kpis: ['First-contact resolution', 'SLA attainment', 'Average resolution and hand-off time', 'Complaint recurrence and satisfaction'],
    discovery: ['Which service requests and incidents drive the most effort or impact?', 'Who can request, approve and receive information?', 'What SLA, priority and escalation model is expected?', 'Which root causes and relationship opportunities should be tracked?'],
  },
  security: {
    actors: ['Business security administrator', 'Authorized users and approvers', 'Identity, access and channel-security teams', 'Fraud, cyber, operations and audit teams'],
    systems: ['Identity and access management', 'Authentication and device management', 'Entitlement and approval-policy engine', 'Fraud, SIEM, case and audit platforms'],
    data: ['User identity, role and authority', 'Entitlement, account access and approval policy', 'Device, credential and authentication event', 'Risk signal, incident and certification evidence'],
    rules: ['Access requires verified identity and approved business authority.', 'Least privilege and segregation of duties apply.', 'Sensitive actions require policy-based authentication and approval.', 'Access must be reviewed and revoked when authority changes.'],
    exceptions: ['Identity proofing or provisioning failure', 'Conflicting role or segregation-of-duties breach', 'Compromised credential or anomalous device', 'Orphaned access or failed revocation'],
    risks: ['Account takeover or unauthorized access', 'Excessive entitlement or approval bypass', 'Fraudulent transaction or data exposure', 'Incomplete certification, logging or revocation'],
    outcomes: ['Verified users and controlled entitlements', 'Enforced approvals and transaction security', 'Timely anomaly and incident response', 'Auditable review, change and revocation'],
    kpis: ['Provisioning and revocation time', 'Authentication success and step-up rate', 'Access-review completion', 'Security incident and fraud-loss rate'],
    discovery: ['Which legal authorities, roles and approval matrices apply?', 'What authentication, device and channel controls are required?', 'Where are segregation-of-duties conflicts possible?', 'How are incidents, certifications and leaver access managed?'],
  },
  notifications: {
    actors: ['Business recipients and administrators', 'Product, service and campaign owners', 'Event, message and channel operations', 'Compliance, preference and analytics teams'],
    systems: ['Event streaming and rules engine', 'Notification and campaign platform', 'Email, SMS, push and in-app gateways', 'Consent, preference and delivery analytics'],
    data: ['Business event and transaction context', 'Recipient, role and routing preference', 'Template, language and approval status', 'Delivery, acknowledgement and response result'],
    rules: ['Messages require a valid business event and eligible recipient.', 'Consent and channel preference apply where required.', 'Sensitive information must be minimized and protected.', 'Mandatory notices, delivery evidence and suppression rules are retained.'],
    exceptions: ['Missing recipient or routing preference', 'Template, approval or localization gap', 'Channel outage or delivery failure', 'Duplicate, late or incorrectly suppressed message'],
    risks: ['Disclosure to the wrong recipient', 'Missed mandatory or time-critical notice', 'Excessive, misleading or non-consented communication', 'Untraceable delivery or response'],
    outcomes: ['Relevant and timely operational awareness', 'Controlled recipient and channel routing', 'Consistent approved communication', 'Auditable delivery, acknowledgement and optimization'],
    kpis: ['Delivery and acknowledgement rate', 'Time from event to notification', 'Failure, suppression and duplicate rate', 'Preference, opt-out and response performance'],
    discovery: ['Which events require operational, mandatory or commercial messages?', 'Who should receive each event across roles and entities?', 'Which channels, timing, language and escalation rules apply?', 'What delivery evidence and response should trigger follow-up?'],
  },
};

function capabilityFor(slug: string): Capability {
  if (slug.includes('onboarding')) return 'onboarding';
  if (slug.includes('accounts-and-deposits')) return 'accounts';
  if (slug.includes('payments')) return 'payments';
  if (slug.includes('liquidity')) return 'liquidity';
  if (slug.includes('lending')) return 'lending';
  if (slug.includes('trade')) return 'trade';
  if (slug.includes('cards')) return 'cards';
  if (slug.includes('service')) return 'service';
  if (slug.includes('security')) return 'security';
  if (slug.includes('notification')) return 'notifications';
  throw new Error(`Unknown segment Journey capability: ${slug}`);
}

export function buildSegmentJourneyDetailedContent(blueprint: SegmentJourneyBlueprint): JourneyContent {
  const template = templates[capabilityFor(blueprint.slug)];
  const segmentName = blueprint.segment === 'sme' ? 'SME' : 'Enterprise Banking';
  const section = (moduleKey: string, key: string, title: string, blockType: string, payload: Record<string, unknown>) => ({
    id: `${blueprint.slug}-${moduleKey}-${key}`,
    title,
    blocks: [{ id: `${blueprint.slug}-${moduleKey}-${key}-block`, blockType, schemaVersion: 1, payload }],
  });
  const makeModule = (key: string, title: string, order: number, sections: ReturnType<typeof section>[]) => ({ id: `${blueprint.slug}-${key}`, title, order, sections });
  const lifecycleDiagram = {
    diagramType: 'business-process', orientation: 'horizontal', title: `${blueprint.title} lifecycle`, description: 'High-level governed lifecycle; detailed bank policy remains subject to review.',
    lanes: [{ id: 'customer', name: 'Customer / Business' }, { id: 'bank', name: 'Bank Teams' }, { id: 'control', name: 'Risk & Control' }],
    nodes: blueprint.stages.map((stage, index) => ({ id: `stage-${index + 1}`, type: index === 0 ? 'start-event' : index === blueprint.stages.length - 1 ? 'end-event' : 'activity', label: stage, laneId: index % 3 === 0 ? 'customer' : index % 3 === 1 ? 'bank' : 'control' })),
    edges: blueprint.stages.slice(1).map((_, index) => ({ id: `edge-${index + 1}`, source: `stage-${index + 1}`, target: `stage-${index + 2}` })),
    businessRules: template.rules.map((rule, index) => ({ id: `RULE-${index + 1}`, rule })), validationCategories: ['Eligibility', 'Authority', 'Risk and compliance', 'Operational readiness'], successOutcome: { state: 'COMPLETED', evidenceRequired: true },
  };
  const modules = [
    makeModule('overview', 'Overview & Product Scope', 1, [
      section('overview', 'context', 'Business Context', 'RICH_TEXT', { content: `${blueprint.summary}\n\nThis governed ${segmentName} Journey separates reusable business knowledge from bank-specific products, policy, pricing and delegated authority.` }),
      section('overview', 'outcomes', 'Customer and Business Outcomes', 'TABLE', { columns: ['Outcome', 'Business value'], rows: template.outcomes.map((value) => [value, `Supports a controlled ${blueprint.title.toLowerCase()} outcome.`]) }),
      section('overview', 'scope', 'Journey Scope', 'CHECKLIST', { items: [...blueprint.stages] }),
      section('overview', 'boundaries', 'Scope Boundaries', 'CALLOUT', { title: 'Governed boundary', content: 'The Journey is product- and institution-neutral. Local product terms, credit authority, market infrastructure, legal interpretation and regulatory obligations must be supplied and approved by the owning bank.' }),
      section('overview', 'diagram', 'Lifecycle Overview', 'DIAGRAM', lifecycleDiagram),
    ]),
    makeModule('actors', 'Actors, Channels & Responsibilities', 2, [
      section('actors', 'stakeholders', 'Key Actors', 'TABLE', { columns: ['Actor', 'Primary responsibility'], rows: template.actors.map((actor) => [actor, `Owns or supports relevant decisions, evidence and hand-offs in ${blueprint.title}.`]) }),
      section('actors', 'channels', 'Channels and Touchpoints', 'CHECKLIST', { items: blueprint.segment === 'sme' ? ['Relationship manager and branch', 'Business web and mobile banking', 'API, file and partner channels where applicable', 'Operations and service desk'] : ['Corporate relationship and specialist coverage', 'Corporate portal, host-to-host and API', 'SWIFT, market and partner infrastructure where applicable', 'Operations, service and implementation teams'] }),
    ]),
    makeModule('systems-data', 'Systems, Integrations & Data', 3, [
      section('systems-data', 'systems', 'Systems and Integrations', 'CHECKLIST', { items: [...template.systems] }),
      section('systems-data', 'entities', 'Core Data Entities', 'TABLE', { columns: ['Entity', 'Required treatment'], rows: template.data.map((value) => [value, 'Define source, owner, validation, retention and downstream use.']) }),
      section('systems-data', 'quality', 'Data Quality and Traceability', 'CALLOUT', { title: 'Evidence requirement', content: 'Critical inputs, decisions, approvals, status changes and customer communications require attributable timestamps, ownership and immutable audit evidence.' }),
    ]),
    ...blueprint.stages.map((stage, index) => {
      const key = `stage-${index + 1}`;
      const rules = template.rules.map((rule, ruleIndex) => [`${index + 1}.${ruleIndex + 1}`, rule, ruleIndex % 2 ? 'Operations / Control' : 'Business / Product']);
      return makeModule(key, `${index + 1}. ${stage}`, index + 4, [
        section(key, 'purpose', 'Purpose', 'RICH_TEXT', { content: `${stage} establishes the required business outcome, ownership and evidence before the Journey advances.` }),
        section(key, 'trigger', 'Trigger and Preconditions', 'CHECKLIST', { items: [`A valid ${segmentName} customer need or lifecycle event exists.`, 'The requester and authority are identified.', 'Required upstream status and access are available.', 'Applicable product, market and policy boundaries are known.'] }),
        section(key, 'inputs', 'Inputs and Evidence', 'CHECKLIST', { items: [...template.data, `Stage-specific evidence for ${stage}`] }),
        section(key, 'process', 'Process Activities', 'CHECKLIST', { items: [`Receive and validate the ${stage.toLowerCase()} request.`, 'Resolve customer, entity, product and authority context.', 'Perform business, operational and control checks.', 'Record decisions, approvals and unresolved exceptions.', 'Communicate status and hand off with complete evidence.'] }),
        section(key, 'rules', 'Rules and Decisions', 'TABLE', { columns: ['Rule', 'Requirement', 'Owner'], rows: rules }),
        section(key, 'outputs', 'Outputs and Exit Criteria', 'CHECKLIST', { items: [`Documented ${stage.toLowerCase()} result`, 'Decision and approval evidence', 'Updated system status and downstream instruction', 'Customer or stakeholder communication', 'Recorded exception, SLA and audit trail where applicable'] }),
        section(key, 'exceptions', 'Exceptions and Controls', 'TABLE', { columns: ['Exception', 'Minimum control response'], rows: template.exceptions.map((value, exceptionIndex) => [value, `Stop or contain processing, assign an owner, retain evidence and apply control ${exceptionIndex + 1}.`]) }),
      ]);
    }),
    makeModule('rules-decisions', 'Business Rules & Decisioning', 10, [
      section('rules-decisions', 'catalog', 'Rule Catalog', 'TABLE', { columns: ['ID', 'Business rule', 'Evidence'], rows: template.rules.map((rule, index) => [`BR-${index + 1}`, rule, 'Input, decision, approver and timestamp']) }),
      section('rules-decisions', 'decisions', 'Key Decision Points', 'TABLE', { columns: ['Decision', 'Possible outcome'], rows: blueprint.stages.map((stage) => [`May ${stage.toLowerCase()} proceed?`, 'Proceed / hold / reject / escalate']) }),
      section('rules-decisions', 'ownership', 'Policy Ownership', 'CALLOUT', { title: 'No implied bank policy', content: 'Thresholds, pricing, limits, scoring, approval authority and regulatory interpretations are deliberately not invented. The owning institution must add and approve them.' }),
    ]),
    makeModule('risk-control', 'Risk, Compliance & Controls', 11, [
      section('risk-control', 'matrix', 'Risk and Control Matrix', 'TABLE', { columns: ['Risk', 'Illustrative control'], rows: template.risks.map((risk) => [risk, 'Preventive validation, approval, monitoring, exception ownership and retained evidence.']) }),
      section('risk-control', 'compliance', 'Compliance Considerations', 'CHECKLIST', { items: ['KYC/KYB, AML, sanctions and fraud controls as applicable', 'Data privacy, confidentiality and records retention', 'Product governance, suitability and customer communication', 'Operational resilience, third-party and market-infrastructure risk', 'Local legal, tax, regulatory and accounting requirements'] }),
      section('risk-control', 'audit', 'Audit Evidence', 'CHECKLIST', { items: ['Authenticated actor and authority', 'Source data and validation results', 'Decision, rationale and approver', 'Terms, notices and customer acknowledgement', 'Status history, exception and resolution evidence'] }),
    ]),
    makeModule('operating-model', 'Service, Monitoring & Operating Model', 12, [
      section('operating-model', 'kpis', 'Key Performance Indicators', 'TABLE', { columns: ['KPI', 'Purpose'], rows: template.kpis.map((kpi) => [kpi, 'Measure customer outcome, control quality and operating efficiency.']) }),
      section('operating-model', 'sla', 'SLA and Escalation', 'CHECKLIST', { items: ['Define service clock, cut-offs and pause conditions.', 'Assign business, operational and control owners.', 'Escalate customer impact, risk events and aged exceptions.', 'Communicate status and recovery expectations.', 'Review recurring breaches and root causes.'] }),
      section('operating-model', 'governance', 'Governance Cadence', 'CHECKLIST', { items: ['Daily operational and exception monitoring', 'Periodic customer and portfolio review', 'Control testing and access certification', 'Product, policy and regulatory change review', 'KPI, incident and continuous-improvement governance'] }),
    ]),
    makeModule('ba-toolkit', 'Sales & Business Analysis Toolkit', 13, [
      section('ba-toolkit', 'discovery', 'Sales Discovery Questions', 'CHECKLIST', { items: [...template.discovery] }),
      section('ba-toolkit', 'analysis', 'BA Analysis Questions', 'CHECKLIST', { items: ['What event starts and ends each stage?', 'Who owns each decision, hand-off, SLA and exception?', 'Which rules vary by product, market, entity or channel?', 'What data is authoritative and what evidence must be retained?', 'Which integrations, failure modes and reconciliation points matter?', 'How will success, customer impact and control effectiveness be measured?'] }),
      section('ba-toolkit', 'deliverables', 'Recommended BA Deliverables', 'CHECKLIST', { items: ['Journey and stakeholder map', 'Process/BPMN and exception flows', 'Business-rule and decision catalog', 'Data model and integration mapping', 'Risk-control and traceability matrix', 'Requirements, acceptance criteria and operating procedures'] }),
      section('ba-toolkit', 'review', 'Pre-Publication Review', 'CALLOUT', { title: 'Required independent review', content: 'Product, operations, risk/compliance, architecture, security and relevant subject-matter owners must validate this Draft before CMS submission and independent publication.' }),
    ]),
  ];
  return journeyContentSchema.parse({ title: blueprint.title, slug: blueprint.slug, summary: blueprint.summary, schemaVersion: 1, metadata: { journeyReader: 'canonical', customerSegment: blueprint.segment, blueprintVersion: 1, contentRelease: 'segment-journey-phase-3-development-v1', maturity: 'detailed-draft' }, modules });
}
