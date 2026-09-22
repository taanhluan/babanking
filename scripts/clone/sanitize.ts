import { excludedModelSet, classificationFor, contentModels, productionUserReferenceFields, type CloneModel } from './clone-policy';
import { IdentityMap } from './identity-map';
import { assertSanitized, validateSanitizedDataset, type SanitizationReport } from './validate-sanitized-dataset';

export type CloneDataset = Partial<Record<CloneModel, Array<Record<string, unknown>>>>;
export type SanitizedClone = { dataset: CloneDataset; report: SanitizationReport };

function sanitizeText(value: unknown) { return typeof value === 'string' ? '[SANITIZED]' : value ?? null; }
function paymentReference(index: number) { return `DEV-PAY-${String(index).padStart(6, '0')}`; }

export function sanitizeDataset(source: CloneDataset, identities = new IdentityMap()): SanitizedClone {
  const dataset: CloneDataset = {};
  let paymentIndex = 0;
  let accessRequestIndex = 0;
  for (const [modelName, rows] of Object.entries(source)) {
    const model = modelName as CloneModel;
    const classification = classificationFor(model);
    if (excludedModelSet.has(model)) continue;
    dataset[model] = (rows ?? []).map((sourceRow) => {
      const row = { ...sourceRow };
      if (model === 'User') {
        const profile = identities.profile(String(sourceRow.id));
        return { ...row, ...profile, passwordHash: '[DEVELOPMENT_HASH_REQUIRED]', lastLoginAt: null };
      }
      for (const field of productionUserReferenceFields) if (typeof row[field] === 'string') row[field] = identities.mapUser(row[field] as string);
      if (model === 'PaymentRecord') {
        paymentIndex += 1;
        row.method = 'DEVELOPMENT_SANITIZED'; row.provider = 'DEVELOPMENT_SANITIZED';
        row.providerReference = paymentReference(paymentIndex); row.adminNote = null;
      }
      if (model === 'AccessRequest') {
        accessRequestIndex += 1;
        Object.assign(row, { name: 'Development Access Request', email: `dev-request-${String(accessRequestIndex).padStart(4, '0')}@example.test`, organization: null, jobTitle: 'Development Test Role', currentBALevel: null, primaryInterest: 'Development testing', professionalObjective: 'Sanitized Development request.', adminNote: null, rejectionReason: null });
      }
      if (model === 'RenewalRequest') { row.memberNote = null; row.adminNote = null; }
      if (model === 'UserScopeGrant' || model === 'UserContentGrant' || model === 'UserKnowledgePackageAssignment') row.reason = sanitizeText(row.reason);
      if (contentModels.has(model)) {
        // Business content is intentionally unchanged; scanner decides if a human review is required.
        delete row.passwordHash; delete row.token; delete row.tokenHash;
      }
      if (classification === 'SANITIZE') return row;
      return row;
    });
  }
  const report = validateSanitizedDataset(dataset as Record<string, unknown[]>);
  assertSanitized(report);
  return { dataset, report };
}
