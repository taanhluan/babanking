export interface BankingJourney {
  id: string;
  category: string;
  name: string;
  description: string;
  customerGoal: string;
  actors: string[];
  capabilities: string[];
  process: string[];
  rules: string[];
  systems: string[];
  risks: string[];
  outputs: string[];
  relatedCases: string[];
}

export const bankingJourneys: BankingJourney[] = [
  {
    id: 'customer-onboarding', category: 'Customer and Accounts', name: 'Customer Onboarding',
    description: 'Registration, identity verification, KYC assessment, and account opening across assisted and digital channels.',
    customerGoal: 'Become an approved customer and open an appropriate account with minimal friction.',
    actors: ['Customer', 'Relationship Manager', 'KYC Analyst', 'Operations'],
    capabilities: ['Customer Registration', 'Identity Verification', 'KYC', 'Account Opening'],
    process: ['Capture customer data', 'Verify identity', 'Screen and assess risk', 'Approve and open account'],
    rules: ['Required documents vary by customer type', 'High-risk customers require enhanced due diligence'],
    systems: ['Mobile and web banking', 'CRM', 'KYC platform', 'Core banking'],
    risks: ['Identity fraud', 'Incomplete consent', 'Sanctions exposure'],
    outputs: ['Journey map', 'Business rules catalogue', 'KYC requirements', 'Exception workflow'],
    relatedCases: ['Designing a Digital Onboarding Journey'],
  },
  {
    id: 'deposits', category: 'Customer and Accounts', name: 'Deposits',
    description: 'Account funding, balance servicing, statements, interest, and deposit lifecycle management.',
    customerGoal: 'Store and manage money securely while understanding balances, interest, and account activity.',
    actors: ['Customer', 'Teller', 'Operations', 'Finance'],
    capabilities: ['Deposit Capture', 'Balance Review', 'Statement Access', 'Interest Posting'],
    process: ['Select account', 'Fund account', 'Post transaction', 'Calculate interest', 'Issue statement'],
    rules: ['Value dates determine interest', 'Transaction limits depend on channel and account type'],
    systems: ['Core banking', 'Branch platform', 'Mobile banking', 'Statement service'],
    risks: ['Incorrect posting', 'Duplicate deposits', 'Interest calculation error'],
    outputs: ['Product rules', 'Posting scenarios', 'Reconciliation requirements', 'Statement mapping'],
    relatedCases: ['Mapping Business Requirements to Banking Capabilities'],
  },
  {
    id: 'personal-finance', category: 'Customer and Accounts', name: 'Personal Finance Management',
    description: 'Budgeting, savings goals, transaction insights, and financial wellbeing support.',
    customerGoal: 'Understand spending and make progress toward personal financial goals.',
    actors: ['Customer', 'Product Manager', 'Data Analyst', 'Advisor'],
    capabilities: ['Budgeting', 'Goal Tracking', 'Insights', 'Recommendations'],
    process: ['Aggregate activity', 'Categorize spending', 'Set goal', 'Track progress', 'Recommend action'],
    rules: ['Customers control data consent', 'Recommendations must explain their source'],
    systems: ['Mobile banking', 'Analytics platform', 'Notification service'],
    risks: ['Incorrect categorization', 'Privacy breach', 'Misleading recommendation'],
    outputs: ['Insight rules', 'Consent requirements', 'Data mapping', 'Customer journey'],
    relatedCases: ['Mapping Business Requirements to Banking Capabilities'],
  },
  {
    id: 'payments', category: 'Money Movement', name: 'Payments and Transfers',
    description: 'Payment initiation, validation, authorization, execution, settlement, and notification.',
    customerGoal: 'Move money accurately, securely, and with clear confirmation of status.',
    actors: ['Payer', 'Payee', 'Operations', 'Fraud Analyst', 'Clearing Network'],
    capabilities: ['Internal Transfer', 'External Transfer', 'Scheduled Payment', 'Bill Payment'],
    process: ['Initiate', 'Validate', 'Authorize', 'Execute', 'Settle', 'Notify'],
    rules: ['Limits vary by customer, channel, and payment type', 'High-risk transactions require step-up authentication'],
    systems: ['Digital banking', 'Payment hub', 'Fraud engine', 'Core banking', 'Clearing network'],
    risks: ['Fraud', 'Duplicate payment', 'Incorrect beneficiary', 'Settlement failure'],
    outputs: ['Payment workflow', 'Status model', 'Limit rules', 'Exception scenarios'],
    relatedCases: ['Understanding the Payment Journey', 'Mapping Business Rules for Payment Limits'],
  },
  {
    id: 'cards', category: 'Cards and Credit', name: 'Cards',
    description: 'Card issuance, activation, controls, authorization, disputes, and servicing.',
    customerGoal: 'Use and control a payment card securely across physical and digital channels.',
    actors: ['Cardholder', 'Merchant', 'Issuer', 'Processor', 'Dispute Analyst'],
    capabilities: ['Card Activation', 'Freeze and Unfreeze', 'PIN Management', 'Card Limits'],
    process: ['Issue card', 'Activate', 'Authorize transaction', 'Post transaction', 'Handle dispute'],
    rules: ['Card status controls authorization', 'Disputes must follow scheme timelines'],
    systems: ['Card management', 'Processor', 'Mobile banking', 'Fraud engine'],
    risks: ['Card fraud', 'Authorization failure', 'Incorrect dispute handling'],
    outputs: ['Card state model', 'Authorization rules', 'Service workflows', 'Dispute requirements'],
    relatedCases: ['Conducting a Fit-Gap Analysis'],
  },
  {
    id: 'lending', category: 'Cards and Credit', name: 'Lending',
    description: 'Application, eligibility, underwriting, approval, disbursement, and loan servicing.',
    customerGoal: 'Obtain suitable credit with transparent decisions and manageable repayment.',
    actors: ['Applicant', 'Loan Officer', 'Underwriter', 'Credit Committee', 'Operations'],
    capabilities: ['Loan Application', 'Eligibility Rules', 'Credit Decision', 'Disbursement', 'Repayment'],
    process: ['Apply', 'Assess eligibility', 'Underwrite', 'Approve', 'Disburse', 'Service'],
    rules: ['Affordability thresholds must be met', 'Approval authority depends on exposure and risk'],
    systems: ['Loan origination', 'Credit bureau', 'Decision engine', 'Core lending'],
    risks: ['Credit risk', 'Unfair decisioning', 'Incorrect pricing'],
    outputs: ['Decision rules', 'Application journey', 'Integration mapping', 'Approval matrix'],
    relatedCases: ['Conducting a Fit-Gap Analysis'],
  },
  {
    id: 'wealth', category: 'Wealth and Advisory', name: 'Wealth and Investment',
    description: 'Investor onboarding, suitability, portfolio setup, order management, and reporting.',
    customerGoal: 'Invest according to personal goals, risk appetite, and regulatory suitability.',
    actors: ['Investor', 'Advisor', 'Portfolio Manager', 'Compliance'],
    capabilities: ['Portfolio Setup', 'Risk Profiling', 'Investment Orders', 'Reporting'],
    process: ['Profile customer', 'Assess suitability', 'Open portfolio', 'Place order', 'Report performance'],
    rules: ['Products must match suitability profile', 'Advice and consent must be recorded'],
    systems: ['Wealth platform', 'Order management', 'Market data', 'CRM'],
    risks: ['Unsuitable advice', 'Market risk', 'Order error'],
    outputs: ['Suitability rules', 'Advisory workflow', 'Disclosure requirements', 'Data mapping'],
    relatedCases: ['Mapping Business Requirements to Banking Capabilities'],
  },
  {
    id: 'customer-service', category: 'Service and Engagement', name: 'Customer Service',
    description: 'Request intake, issue resolution, complaints, escalation, and service recovery.',
    customerGoal: 'Resolve a request or problem efficiently with clear ownership and updates.',
    actors: ['Customer', 'Service Agent', 'Operations', 'Complaint Manager'],
    capabilities: ['Case Creation', 'Escalation', 'Contact History', 'Resolution'],
    process: ['Identify customer', 'Capture request', 'Route case', 'Resolve', 'Confirm closure'],
    rules: ['Complaint cases have regulatory timelines', 'Sensitive actions require authentication'],
    systems: ['Contact center', 'CRM', 'Case management', 'Knowledge base'],
    risks: ['Missed SLA', 'Unauthorized disclosure', 'Poor resolution'],
    outputs: ['Case taxonomy', 'Routing rules', 'SLA matrix', 'Service workflow'],
    relatedCases: ['From Requirement Notes to BRD'],
  },
  {
    id: 'notifications', category: 'Service and Engagement', name: 'Notification and Engagement',
    description: 'Event-driven alerts, service messages, preferences, and customer communications.',
    customerGoal: 'Receive timely, relevant messages through preferred and consented channels.',
    actors: ['Customer', 'Product Team', 'Operations', 'Marketing'],
    capabilities: ['Alert Rules', 'Channel Preferences', 'Journey Events', 'Message Delivery'],
    process: ['Detect event', 'Evaluate preference', 'Compose message', 'Deliver', 'Track outcome'],
    rules: ['Mandatory alerts cannot be disabled', 'Marketing messages require valid consent'],
    systems: ['Event platform', 'Notification hub', 'Email and SMS gateway', 'Mobile app'],
    risks: ['Message leakage', 'Delivery failure', 'Consent violation'],
    outputs: ['Event catalogue', 'Preference rules', 'Message matrix', 'Failure handling'],
    relatedCases: ['Mapping Business Requirements to Banking Capabilities'],
  },
  {
    id: 'security', category: 'Risk, Security and Access', name: 'Security and Access',
    description: 'Authentication, authorization, user roles, fraud controls, and access governance.',
    customerGoal: 'Access banking services securely without unnecessary friction.',
    actors: ['Customer', 'Employee', 'Security Team', 'Fraud Analyst', 'Auditor'],
    capabilities: ['MFA', 'Role-Based Access', 'Audit Trails', 'Fraud Review'],
    process: ['Identify user', 'Authenticate', 'Assess risk', 'Authorize action', 'Record audit'],
    rules: ['Risk signals determine authentication strength', 'Privileged access requires approval and review'],
    systems: ['Identity provider', 'Fraud engine', 'Access management', 'Audit platform'],
    risks: ['Account takeover', 'Excessive privilege', 'Missing audit evidence'],
    outputs: ['Access matrix', 'Authentication rules', 'Control requirements', 'Audit scenarios'],
    relatedCases: ['Conducting a Fit-Gap Analysis'],
  },
];

export const journeyCategories = [...new Set(bankingJourneys.map((journey) => journey.category))];
export const featuredJourneyIds = ['customer-onboarding', 'payments', 'lending', 'security'];
