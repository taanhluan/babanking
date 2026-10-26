import { PrismaClient, type KpiComparator } from '@prisma/client';
import { assertDatabaseEnvironmentSafe, parseServerEnvironment } from '../src/server/environment-core';
import { loadEnvironmentFiles } from './load-environment-files';

/**
 * Seeds the BA team KPI template library with the 13 standard, person-neutral KPIs.
 * Read-only verification without --apply; idempotent (matches by name) and audited with it.
 */
const releaseId = 'ba-kpi-templates-development-v1';

type Template = { name: string; capabilityArea: string; comparator: KpiComparator; defaultTarget: number; unitLabel: string };
const templates: Template[] = [
  { name: 'Structured Specification Quality Score', capabilityArea: 'STRUCTURED_SPECIFICATION', comparator: 'GTE', defaultTarget: 95, unitLabel: '%' },
  { name: 'Requirement First-Pass Approval Rate', capabilityArea: 'STRUCTURED_SPECIFICATION', comparator: 'GTE', defaultTarget: 90, unitLabel: '%' },
  { name: 'Process Mapping Accuracy', capabilityArea: 'VALIDATION_CRITICAL_THINKING', comparator: 'GTE', defaultTarget: 95, unitLabel: '%' },
  { name: 'Business Rule Validation Coverage', capabilityArea: 'VALIDATION_CRITICAL_THINKING', comparator: 'GTE', defaultTarget: 95, unitLabel: '%' },
  { name: 'Process Improvement Opportunities Identified', capabilityArea: 'VALIDATION_CRITICAL_THINKING', comparator: 'GTE', defaultTarget: 3, unitLabel: 'initiatives / quarter' },
  { name: 'Stakeholder Satisfaction Score', capabilityArea: 'COLLABORATION', comparator: 'GTE', defaultTarget: 4.5, unitLabel: '/ 5' },
  { name: 'Cross-Functional Collaboration Score', capabilityArea: 'COLLABORATION', comparator: 'GTE', defaultTarget: 4.5, unitLabel: '/ 5' },
  { name: 'Domain Knowledge Assessment', capabilityArea: 'DOMAIN_UNDERSTANDING', comparator: 'GTE', defaultTarget: 90, unitLabel: '%' },
  { name: 'AI-Assisted Productivity Adoption', capabilityArea: 'AI_ASSISTED', comparator: 'GTE', defaultTarget: 90, unitLabel: '% of deliverables' },
  { name: 'Productivity Improvement', capabilityArea: 'AI_ASSISTED', comparator: 'GTE', defaultTarget: 20, unitLabel: '% effort reduction' },
  { name: 'Delivery Timeliness', capabilityArea: 'STRUCTURED_SPECIFICATION', comparator: 'GTE', defaultTarget: 95, unitLabel: '%' },
  { name: 'Rework Rate', capabilityArea: 'STRUCTURED_SPECIFICATION', comparator: 'LTE', defaultTarget: 5, unitLabel: '%' },
  { name: 'Knowledge Sharing Contribution', capabilityArea: 'COLLABORATION', comparator: 'GTE', defaultTarget: 1, unitLabel: 'sessions / quarter' },
];

loadEnvironmentFiles();
const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
assertDatabaseEnvironmentSafe(environment);
if (environment.APP_ENV !== 'development' || environment.DATABASE_ENVIRONMENT !== 'development') {
  throw new Error('BA KPI template seeding is allowed only with a development application and development database.');
}

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

async function pending() {
  const existing = await prisma.baKpiTemplate.findMany({ where: { name: { in: templates.map((template) => template.name) } }, select: { name: true } });
  return templates.filter((template) => !existing.some((entry) => entry.name === template.name));
}

async function main() {
  const missing = await pending();
  console.log(JSON.stringify({ releaseId, total: templates.length, existing: templates.length - missing.length, pending: missing.length }));
  if (!apply) return;
  if (!missing.length) {
    console.log('Nothing to apply.');
    return;
  }
  await prisma.$transaction(async (tx) => {
    for (const template of missing) {
      const sortOrder = templates.indexOf(template);
      const created = await tx.baKpiTemplate.create({ data: { ...template, sortOrder }, select: { id: true } });
      await tx.auditLog.create({ data: { actorId: null, action: 'BA_KPI_TEMPLATE_SEEDED', entityType: 'BaKpiTemplate', entityId: created.id, metadataJson: JSON.stringify({ environment: environment.APP_ENV, releaseId, templateId: created.id }) } });
    }
  }, { timeout: 30_000 });
  const after = await pending();
  if (after.length) throw new Error('BA KPI template read-back failed.');
  console.log(JSON.stringify({ releaseId, applied: missing.length, pending: 0 }));
}

main().finally(() => prisma.$disconnect());
