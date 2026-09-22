import { journeyContentSchema, type JourneyContent } from '@/server/cms/journey-content-schema';
import type { CustomerSegmentSlug } from './customer-segment-domain';

export type SegmentJourneyBlueprint = {
  slug: string;
  title: string;
  summary: string;
  segment: Exclude<CustomerSegmentSlug, 'retail-banking'>;
  scopeCode: string;
  stages: readonly string[];
};

const sme = (value: Omit<SegmentJourneyBlueprint, 'segment'>): SegmentJourneyBlueprint => ({ ...value, segment: 'sme' });
const enterprise = (value: Omit<SegmentJourneyBlueprint, 'segment'>): SegmentJourneyBlueprint => ({ ...value, segment: 'enterprise-banking' });

export const segmentJourneyBlueprints: readonly SegmentJourneyBlueprint[] = [
  sme({ slug: 'sme-business-onboarding', title: 'SME Business Onboarding', summary: 'End-to-end SME onboarding covering business eligibility, KYB/KYC, beneficial owners, mandates, risk assessment, account setup, digital activation and controlled exception handling.', scopeCode: 'CUSTOMER_ONBOARDING', stages: ['Lead qualification and eligibility', 'Business and ownership data capture', 'KYB/KYC and screening', 'Risk assessment and approval', 'Account, mandate and channel setup', 'Activation and post-onboarding review'] }),
  sme({ slug: 'sme-business-accounts-and-deposits', title: 'SME Business Accounts and Deposits', summary: 'SME account and deposit journey covering operating accounts, multi-currency needs, term deposits, mandates, pricing, servicing, interest, statements and closure.', scopeCode: 'DEPOSITS', stages: ['Needs and account structure discovery', 'Product and pricing selection', 'Account opening and funding', 'Mandates and operating controls', 'Servicing, statements and interest', 'Renewal, maturity or closure'] }),
  sme({ slug: 'sme-payments-collections-and-merchant-services', title: 'SME Payments, Collections and Merchant Services', summary: 'SME transaction-banking journey covering transfers, bulk payments, payroll, tax, QR, POS, gateways, virtual accounts, collection matching and reconciliation.', scopeCode: 'PAYMENTS', stages: ['Flow and channel discovery', 'Service configuration and limits', 'Payment or collection initiation', 'Authorization and processing', 'Settlement and reconciliation', 'Exception, dispute and service management'] }),
  sme({ slug: 'sme-cash-and-liquidity-management', title: 'SME Cash and Liquidity Management', summary: 'SME cash-management journey covering cash visibility, receivables, payables, forecasting, sweeping, liquidity buffers, surplus placement and early-warning controls.', scopeCode: 'DEPOSITS', stages: ['Cash-flow discovery', 'Account and data aggregation', 'Forecasting and liquidity planning', 'Collection and payment optimization', 'Surplus and shortfall actions', 'Monitoring and periodic review'] }),
  sme({ slug: 'sme-business-lending-and-working-capital', title: 'SME Business Lending and Working Capital', summary: 'SME financing journey covering overdrafts, revolving lines, working-capital and term loans, credit assessment, collateral, approval, drawdown, monitoring and repayment.', scopeCode: 'LENDING', stages: ['Financing need discovery', 'Application and financial data capture', 'Credit and cash-flow assessment', 'Structuring, collateral and approval', 'Contracting and drawdown', 'Monitoring, repayment and resolution'] }),
  sme({ slug: 'sme-trade-finance-and-foreign-exchange', title: 'SME Trade Finance and Foreign Exchange', summary: 'SME trade journey covering import and export needs, letters of credit, collections, guarantees, trade loans, foreign exchange and cross-border settlement controls.', scopeCode: 'PAYMENTS', stages: ['Trade-flow discovery', 'Instrument and currency selection', 'Application and document capture', 'Compliance and credit checks', 'Issuance, processing and settlement', 'Discrepancy, claim and closure management'] }),
  sme({ slug: 'sme-business-cards-and-expense-management', title: 'SME Business Cards and Expense Management', summary: 'SME commercial-card journey covering company and employee cards, controls, limits, issuance, spend visibility, reconciliation, disputes, renewal and closure.', scopeCode: 'CARDS', stages: ['Program and user-needs discovery', 'Eligibility and control design', 'Card issuance and activation', 'Spend authorization and controls', 'Expense reconciliation and servicing', 'Dispute, renewal and closure'] }),
  sme({ slug: 'sme-customer-service-and-relationship-management', title: 'SME Customer Service and Relationship Management', summary: 'SME service journey covering relationship ownership, inquiries, service requests, complaints, reviews, cross-sell discovery, escalation and service-quality management.', scopeCode: 'CUSTOMER_SERVICE', stages: ['Relationship and service setup', 'Inquiry or request intake', 'Authentication and classification', 'Resolution and fulfillment', 'Escalation and communication', 'Feedback and relationship review'] }),
  sme({ slug: 'sme-security-roles-and-access', title: 'SME Security, Roles and Access', summary: 'SME security journey covering business users, roles, approval matrices, authentication, limits, device management, consent, fraud controls and access revocation.', scopeCode: 'SECURITY_ACCESS', stages: ['Authority and role discovery', 'User and entitlement setup', 'Authentication and device binding', 'Approval and transaction controls', 'Monitoring and incident response', 'Access review and revocation'] }),
  sme({ slug: 'sme-notifications-and-engagement', title: 'SME Notifications and Engagement', summary: 'SME engagement journey covering transaction alerts, operational notifications, service messages, targeted offers, consent, channel preferences and communication audit.', scopeCode: 'NOTIFICATION_ENGAGEMENT', stages: ['Communication-needs discovery', 'Consent and preference setup', 'Event and audience selection', 'Message creation and approval', 'Delivery and response handling', 'Performance and compliance review'] }),
  enterprise({ slug: 'enterprise-corporate-onboarding', title: 'Enterprise Corporate Onboarding', summary: 'End-to-end corporate onboarding covering legal entities, ownership and control, complex mandates, KYC/KYB, risk approval, account structures, connectivity and activation.', scopeCode: 'CUSTOMER_ONBOARDING', stages: ['Group and relationship scoping', 'Entity, ownership and authority capture', 'KYC/KYB and regulatory screening', 'Risk and relationship approval', 'Account, mandate and connectivity setup', 'Activation and periodic-review planning'] }),
  enterprise({ slug: 'enterprise-corporate-accounts-and-deposits', title: 'Enterprise Corporate Accounts and Deposits', summary: 'Enterprise account journey covering multi-entity and multi-currency structures, operating and deposit accounts, mandates, pricing, statements, interest and lifecycle servicing.', scopeCode: 'DEPOSITS', stages: ['Group account-structure discovery', 'Product, currency and pricing design', 'Account opening and funding', 'Mandates and control implementation', 'Reporting, servicing and interest', 'Restructure, maturity or closure'] }),
  enterprise({ slug: 'enterprise-payments-and-collections', title: 'Enterprise Payments and Collections', summary: 'Enterprise payments journey covering high-value and bulk payments, payroll, tax, direct debit, virtual accounts, host connectivity, settlement and reconciliation.', scopeCode: 'PAYMENTS', stages: ['Flow, volume and market discovery', 'Channel, format and control design', 'Initiation and authorization', 'Clearing and settlement', 'Reconciliation and reporting', 'Exception and investigation management'] }),
  enterprise({ slug: 'enterprise-treasury-and-liquidity-management', title: 'Enterprise Treasury and Liquidity Management', summary: 'Enterprise treasury journey covering global cash visibility, pooling, sweeping, forecasting, liquidity concentration, investments, funding and risk controls.', scopeCode: 'DEPOSITS', stages: ['Liquidity and entity discovery', 'Account and data consolidation', 'Forecasting and position management', 'Pooling, sweeping and concentration', 'Investment and funding actions', 'Risk, reporting and optimization review'] }),
  enterprise({ slug: 'enterprise-corporate-lending-and-structured-finance', title: 'Enterprise Corporate Lending and Structured Finance', summary: 'Enterprise financing journey covering bilateral and structured facilities, syndication context, credit assessment, covenants, security, drawdown, monitoring and resolution.', scopeCode: 'LENDING', stages: ['Strategic financing discovery', 'Information memorandum and due diligence', 'Credit assessment and structuring', 'Approval, documentation and security', 'Facility setup and drawdown', 'Covenant monitoring, repayment and resolution'] }),
  enterprise({ slug: 'enterprise-trade-and-supply-chain-finance', title: 'Enterprise Trade and Supply Chain Finance', summary: 'Enterprise trade journey covering documentary instruments, guarantees, supply-chain programs, buyer and supplier finance, foreign exchange and cross-border controls.', scopeCode: 'PAYMENTS', stages: ['Trade ecosystem discovery', 'Program and instrument design', 'Counterparty onboarding and limits', 'Document and transaction processing', 'Funding, settlement and reconciliation', 'Discrepancy, claim and portfolio review'] }),
  enterprise({ slug: 'enterprise-commercial-cards-and-expense-management', title: 'Enterprise Commercial Cards and Expense Management', summary: 'Enterprise commercial-card journey covering corporate, purchasing and virtual cards, hierarchy controls, issuance, authorization, expense integration, disputes and renewal.', scopeCode: 'CARDS', stages: ['Program and hierarchy discovery', 'Policy, limit and control design', 'Card and user provisioning', 'Authorization and spend controls', 'Data integration and reconciliation', 'Dispute, review and lifecycle management'] }),
  enterprise({ slug: 'enterprise-corporate-service-and-relationship-management', title: 'Enterprise Corporate Service and Relationship Management', summary: 'Enterprise service journey covering relationship teams, complex requests, incidents, complaints, service governance, escalation, reviews and opportunity management.', scopeCode: 'CUSTOMER_SERVICE', stages: ['Coverage and service-model setup', 'Request or incident intake', 'Authentication and impact assessment', 'Coordinated resolution and fulfillment', 'Executive escalation and communication', 'Service review and relationship planning'] }),
  enterprise({ slug: 'enterprise-security-entitlements-and-access', title: 'Enterprise Security, Entitlements and Access', summary: 'Enterprise security journey covering complex user hierarchies, entitlements, approval policies, authentication, connectivity security, fraud controls and periodic certification.', scopeCode: 'SECURITY_ACCESS', stages: ['Authority and policy discovery', 'Role and entitlement design', 'Provisioning and authentication', 'Approval and transaction enforcement', 'Monitoring and incident response', 'Certification, change and revocation'] }),
  enterprise({ slug: 'enterprise-notifications-and-event-management', title: 'Enterprise Notifications and Event Management', summary: 'Enterprise communication journey covering operational alerts, treasury events, service notices, multi-user routing, consent, channel controls and auditable delivery.', scopeCode: 'NOTIFICATION_ENGAGEMENT', stages: ['Stakeholder and event discovery', 'Routing and preference configuration', 'Event detection and audience resolution', 'Message approval and delivery', 'Acknowledgement and escalation', 'Audit, performance and control review'] }),
];

export function buildSegmentJourneyDraftContent(blueprint: SegmentJourneyBlueprint): JourneyContent {
  return journeyContentSchema.parse({
    title: blueprint.title,
    slug: blueprint.slug,
    summary: blueprint.summary,
    schemaVersion: 1,
    metadata: {
      journeyReader: 'canonical',
      customerSegment: blueprint.segment,
      blueprintVersion: 1,
      maturity: 'initial-draft',
    },
    modules: [
      {
        id: `${blueprint.slug}-overview`,
        title: 'Overview & Scope',
        order: 1,
        sections: [{
          id: `${blueprint.slug}-business-context`,
          title: 'Business Context',
          order: 1,
          blocks: [{ id: `${blueprint.slug}-context`, blockType: 'RICH_TEXT', schemaVersion: 1, payload: { content: blueprint.summary } }],
        }],
      },
      {
        id: `${blueprint.slug}-lifecycle`,
        title: 'Lifecycle Stages',
        order: 2,
        sections: [{
          id: `${blueprint.slug}-lifecycle-stages`,
          title: 'End-to-End Stages',
          order: 1,
          blocks: [{ id: `${blueprint.slug}-stage-list`, blockType: 'CHECKLIST', schemaVersion: 1, payload: { items: [...blueprint.stages] } }],
        }],
      },
      {
        id: `${blueprint.slug}-business-analysis`,
        title: 'Business Analysis',
        order: 3,
        sections: [{
          id: `${blueprint.slug}-analysis-checklist`,
          title: 'Analysis Checklist',
          order: 1,
          blocks: [
            { id: `${blueprint.slug}-analysis-items`, blockType: 'CHECKLIST', schemaVersion: 1, payload: { items: ['Actors, ownership and hand-offs', 'Triggers, preconditions, inputs and outputs', 'Business rules, validations and decision points', 'Exceptions, service levels and escalation paths', 'Systems, integrations, data and audit evidence', 'Risk, compliance, security and operational controls'] } },
            { id: `${blueprint.slug}-draft-note`, blockType: 'CALLOUT', schemaVersion: 1, payload: { tone: 'warning', content: 'Initial governed draft. Bank-specific products, policies, limits, pricing, controls and regulatory obligations require Product Owner and subject-matter review before publication.' } },
          ],
        }],
      },
    ],
  });
}
