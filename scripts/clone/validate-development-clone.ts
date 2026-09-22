import type { CloneDataset } from './sanitize';

export type IntegrityCounts = Record<'FK_VIOLATIONS'|'UNIQUE_VIOLATIONS'|'PUBLISHED_REVISION_POINTER_ERRORS'|'TRANSLATION_POINTER_ERRORS'|'BA_DOCUMENT_PRIMARY_JOURNEY_ERRORS'|'CONTENT_SCOPE_LINK_ERRORS'|'MEMBERSHIP_PLAN_LINK_ERRORS'|'PAYMENT_MEMBERSHIP_LINK_ERRORS'|'USER_GRANT_LINK_ERRORS'|'PACKAGE_ASSIGNMENT_LINK_ERRORS'|'JOURNEY_SLUG_MISMATCHES'|'REVISION_HISTORY_GAPS', number>;
type Row = Record<string, unknown>;
export const emptyIntegrityCounts = (): IntegrityCounts => ({ FK_VIOLATIONS: 0, UNIQUE_VIOLATIONS: 0, PUBLISHED_REVISION_POINTER_ERRORS: 0, TRANSLATION_POINTER_ERRORS: 0, BA_DOCUMENT_PRIMARY_JOURNEY_ERRORS: 0, CONTENT_SCOPE_LINK_ERRORS: 0, MEMBERSHIP_PLAN_LINK_ERRORS: 0, PAYMENT_MEMBERSHIP_LINK_ERRORS: 0, USER_GRANT_LINK_ERRORS: 0, PACKAGE_ASSIGNMENT_LINK_ERRORS: 0, JOURNEY_SLUG_MISMATCHES: 0, REVISION_HISTORY_GAPS: 0 });
function rows(dataset: CloneDataset, model: keyof CloneDataset) { return (dataset[model] ?? []) as Row[]; }
function ids(dataset: CloneDataset, model: keyof CloneDataset) { return new Set(rows(dataset, model).map((row) => String(row.id))); }
function countMissing(check: Row[], field: string, known: Set<string>) { return check.filter((row) => row[field] != null && !known.has(String(row[field]))).length; }
function duplicates(check: Row[]) { const seen = new Set<string>(); return check.reduce((count, row) => { const id = String(row.id); if (seen.has(id)) return count + 1; seen.add(id); return count; }, 0); }
function revisionGaps(check: Row[], parentField: string) { const versions = new Map<string, number[]>(); for (const row of check) { const version = Number(row.version); if (Number.isInteger(version)) versions.set(String(row[parentField]), [...(versions.get(String(row[parentField])) ?? []), version]); } return [...versions.values()].reduce((count, values) => { const ordered = [...values].sort((a, b) => a - b); return count + ordered.reduce((gaps, value, index) => gaps + (index > 0 && value !== ordered[index - 1] + 1 ? 1 : 0), 0); }, 0); }
export function assertIntegrity(counts: IntegrityCounts) { if (Object.values(counts).some(Boolean)) throw new Error('DEVELOPMENT_CLONE_INTEGRITY_FAILED'); }
/** Pure in-memory pre-load checks. It never opens a database connection. */
export function validateDatasetShape(dataset: CloneDataset) {
  const integrity = emptyIntegrityCounts(); const users = ids(dataset, 'User'); const plans = ids(dataset, 'MembershipPlan'); const memberships = ids(dataset, 'Membership'); const requests = ids(dataset, 'AccessRequest'); const contents = ids(dataset, 'ContentItem'); const revisions = ids(dataset, 'ContentRevision'); const translations = ids(dataset, 'ContentTranslation'); const translationRevisions = ids(dataset, 'TranslationRevision'); const scopes = ids(dataset, 'KnowledgeScope'); const packages = ids(dataset, 'KnowledgePackage');
  const userLinked = [...rows(dataset, 'Membership'), ...rows(dataset, 'PaymentRecord'), ...rows(dataset, 'RenewalRequest'), ...rows(dataset, 'UserScopeGrant'), ...rows(dataset, 'UserContentGrant'), ...rows(dataset, 'UserKnowledgePackageAssignment')];
  integrity.FK_VIOLATIONS += countMissing(userLinked, 'userId', users) + countMissing(rows(dataset, 'ContentRevision'), 'authorId', users) + countMissing(rows(dataset, 'ContentRevision'), 'reviewerId', users) + countMissing(rows(dataset, 'TranslationRevision'), 'authorId', users) + countMissing(rows(dataset, 'TranslationRevision'), 'reviewerId', users);
  for (const model of Object.keys(dataset) as Array<keyof CloneDataset>) integrity.UNIQUE_VIOLATIONS += duplicates(rows(dataset, model));
  integrity.PUBLISHED_REVISION_POINTER_ERRORS = countMissing(rows(dataset, 'ContentItem'), 'publishedRevisionId', revisions);
  integrity.TRANSLATION_POINTER_ERRORS = countMissing(rows(dataset, 'ContentTranslation'), 'publishedRevisionId', translationRevisions) + countMissing(rows(dataset, 'TranslationRevision'), 'contentTranslationId', translations);
  integrity.BA_DOCUMENT_PRIMARY_JOURNEY_ERRORS = rows(dataset, 'ContentItem').filter((row) => row.type === 'BA_DOCUMENT' && (row.primaryJourneyContentItemId == null || !contents.has(String(row.primaryJourneyContentItemId)))).length;
  integrity.CONTENT_SCOPE_LINK_ERRORS = countMissing(rows(dataset, 'ContentKnowledgeScope'), 'contentItemId', contents) + countMissing(rows(dataset, 'ContentKnowledgeScope'), 'knowledgeScopeId', scopes);
  integrity.MEMBERSHIP_PLAN_LINK_ERRORS = countMissing(rows(dataset, 'Membership'), 'planId', plans) + countMissing(rows(dataset, 'AccessRequest'), 'requestedPlanId', plans);
  integrity.PAYMENT_MEMBERSHIP_LINK_ERRORS = countMissing(rows(dataset, 'PaymentRecord'), 'membershipId', memberships) + countMissing(rows(dataset, 'PaymentRecord'), 'accessRequestId', requests) + countMissing(rows(dataset, 'PaymentRecord'), 'planId', plans);
  integrity.USER_GRANT_LINK_ERRORS = countMissing(rows(dataset, 'UserScopeGrant'), 'knowledgeScopeId', scopes) + countMissing(rows(dataset, 'UserContentGrant'), 'contentItemId', contents);
  integrity.PACKAGE_ASSIGNMENT_LINK_ERRORS = countMissing(rows(dataset, 'KnowledgePackagePermission'), 'knowledgePackageId', packages) + countMissing(rows(dataset, 'UserKnowledgePackageAssignment'), 'knowledgePackageId', packages);
  integrity.JOURNEY_SLUG_MISMATCHES = rows(dataset, 'ContentItem').filter((row) => row.type === 'BANKING_JOURNEY' && (typeof row.slug !== 'string' || row.slug.length === 0)).length;
  integrity.REVISION_HISTORY_GAPS = revisionGaps(rows(dataset, 'ContentRevision'), 'contentItemId') + revisionGaps(rows(dataset, 'TranslationRevision'), 'contentTranslationId');
  return { modelCounts: Object.fromEntries(Object.entries(dataset).map(([model, modelRows]) => [model, modelRows?.length ?? 0])), integrity };
}
