import { forbiddenOutputKeys } from './clone-policy';

export type FindingCategory = 'SECRET' | 'PRIVATE_KEY' | 'EMAIL' | 'PHONE' | 'PRODUCTION_URL' | 'PAYMENT' | 'CONNECTION' | 'UNKNOWN_SUSPICIOUS';
export type Finding = { path: string; category: FindingCategory };
export type SanitizationReport = { findings: Finding[]; counters: Record<string, number>; contentSensitivityReviewRequired: boolean };
export type SafeFindingDiagnostic = { model: string; field: string; category: FindingCategory; affectedRecords: number; findings: number; governedBusinessContent: boolean };

const patterns: Array<[FindingCategory, RegExp]> = [
  ['PRIVATE_KEY', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i],
  ['CONNECTION', /postgres(?:ql)?:\/\/[^\s]+/i],
  ['SECRET', /(?:api[_-]?key|auth[_-]?secret|bearer\s+|secret\s*[:=]|token\s*[:=])[^\s,}]+/i],
  ['EMAIL', /[A-Z0-9._%+-]+@(?!example\.test\b)[A-Z0-9.-]+\.[A-Z]{2,}/i],
  ['PHONE', /(?:\+?\d[\d .()-]{7,}\d)/],
  ['PAYMENT', /(?:\b(?:card|cvv|iban|swift|account number)\b|\b\d{13,19}\b)/i],
  ['PRODUCTION_URL', /https?:\/\/[^\s"']*(?:vercel\.app|production)[^\s"']*/i],
];
const approvedGovernedFindings = new Set([
  'ContentItem|previewJson|PAYMENT', 'ContentTranslation|summary|PAYMENT',
  'TranslationRevision|contentJson|PAYMENT', 'ContentRevision|contentJson|PAYMENT',
  'ContentRevision|contentJson|PHONE', 'ContentRevision|contentJson|EMAIL',
]);
function findingKey(finding: Finding) {
  const match = /^([A-Za-z]+)\[\d+\](?:\.([A-Za-z0-9_]+))?/.exec(finding.path);
  return match ? `${match[1]}|${match[2] ?? '[root]'}|${finding.category}` : '';
}

export function scanValue(value: unknown, path: string, report: SanitizationReport): void {
  if (value == null) return;
  if (typeof value === 'string') {
    for (const [category, pattern] of patterns) if (pattern.test(value)) report.findings.push({ path, category });
    return;
  }
  if (Array.isArray(value)) value.forEach((entry, index) => scanValue(entry, `${path}[${index}]`, report));
  else if (typeof value === 'object') Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    const approvedDevelopmentHash = key === 'passwordHash' && entry === '[DEVELOPMENT_HASH_REQUIRED]';
    if (forbiddenOutputKeys.has(key) && !approvedDevelopmentHash) report.findings.push({ path: `${path}.${key}`, category: 'UNKNOWN_SUSPICIOUS' });
    scanValue(entry, `${path}.${key}`, report);
  });
}

export function validateSanitizedDataset(dataset: Record<string, unknown[]>): SanitizationReport {
  const report: SanitizationReport = { findings: [], counters: {}, contentSensitivityReviewRequired: false };
  for (const [model, rows] of Object.entries(dataset)) rows.forEach((row, index) => scanValue(row, `${model}[${index}]`, report));
  for (const finding of report.findings) report.counters[finding.category] = (report.counters[finding.category] ?? 0) + 1;
  report.contentSensitivityReviewRequired = report.findings.some((finding) => /^(?:Content(?:Item|Revision|Translation)|TranslationRevision)/.test(finding.path));
  return report;
}

export function assertSanitized(report: SanitizationReport) {
  const unapproved = report.findings.filter((finding) => !approvedGovernedFindings.has(findingKey(finding)));
  if (unapproved.some((finding) => /^(?:Content(?:Item|Revision|Translation)|TranslationRevision)/.test(finding.path))) {
    const error = Object.assign(new Error('CONTENT_SENSITIVITY_REVIEW_REQUIRED'), { diagnostics: safeFindingDiagnostics(report) });
    throw error;
  }
  if (unapproved.length) throw new Error('SANITIZED_DATASET_FORBIDDEN_MATERIAL');
}

/** Aggregates only model/field/category metadata; source values never leave the scanner. */
export function safeFindingDiagnostics(report: SanitizationReport): SafeFindingDiagnostic[] {
  const groups = new Map<string, SafeFindingDiagnostic & { records: Set<string> }>();
  for (const finding of report.findings) {
    const match = /^([A-Za-z]+)\[(\d+)\](?:\.([A-Za-z0-9_]+))?/.exec(finding.path);
    if (!match) continue;
    const [, model, record, field = '[root]'] = match;
    const key = `${model}|${field}|${finding.category}`;
    const entry = groups.get(key) ?? { model, field, category: finding.category, affectedRecords: 0, findings: 0, governedBusinessContent: /^(ContentItem|ContentRevision|ContentTranslation|TranslationRevision)$/.test(model), records: new Set<string>() };
    entry.findings += 1; entry.records.add(record); entry.affectedRecords = entry.records.size; groups.set(key, entry);
  }
  return [...groups.values()].map((entry) => ({ model: entry.model, field: entry.field, category: entry.category, affectedRecords: entry.affectedRecords, findings: entry.findings, governedBusinessContent: entry.governedBusinessContent }));
}
