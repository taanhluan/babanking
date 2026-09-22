import { assertSourceProof, type ReadOnlySourceReader } from './clone/source-reader';
import { sanitizeDataset } from './clone/sanitize';
import { validateDatasetShape } from './clone/validate-development-clone';
import { assertIntegrity } from './clone/validate-development-clone';
import { cloneModelPolicy } from './clone/clone-policy';
import { ProductionReadOnlySourceReader } from './clone/production-readonly-source-reader';
import { DevelopmentReplacementExecutor, PrismaDevelopmentReplacementPort, type DevelopmentReplacementPort } from './clone/development-replacement-executor';
import { CloneOperationError, isCloneOperationError } from './clone/clone-operation-error';

export async function dryRun(reader: ReadOnlySourceReader) {
  const proof = await reader.verify(); assertSourceProof(proof);
  const source = await reader.readAll();
  const sanitized = sanitizeDataset(source);
  const validation = validateDatasetShape(sanitized.dataset); assertIntegrity(validation.integrity);
  return { mode: 'DRY_RUN' as const, sourceModelCounts: Object.fromEntries(Object.entries(source).map(([model, rows]) => [model, rows?.length ?? 0])), classifications: cloneModelPolicy, sanitizedModelCounts: validation.modelCounts, findings: sanitized.report.counters, contentSensitivityReviewRequired: sanitized.report.contentSensitivityReviewRequired, integrity: validation.integrity };
}

export async function replaceDevelopment(reader: ReadOnlySourceReader, destination: DevelopmentReplacementPort) {
  if (process.env.CONFIRM_REPLACE_DEVELOPMENT !== 'YES') throw new CloneOperationError('DEVELOPMENT_REPLACEMENT_CONFIRMATION_REQUIRED');
  const proof = await reader.verify(); assertSourceProof(proof);
  const source = await reader.readAll();
  const sanitized = sanitizeDataset(source);
  const validation = validateDatasetShape(sanitized.dataset); assertIntegrity(validation.integrity);
  await new DevelopmentReplacementExecutor(destination).replace(sanitized.dataset, proof);
  return { mode: 'REPLACE_DEVELOPMENT' as const, sourceModelCounts: Object.fromEntries(Object.entries(source).map(([model, rows]) => [model, rows?.length ?? 0])), classifications: cloneModelPolicy, sanitizedModelCounts: validation.modelCounts, findings: sanitized.report.counters, contentSensitivityReviewRequired: sanitized.report.contentSensitivityReviewRequired, integrity: validation.integrity };
}

export async function verifyDevelopmentDestination(destination: DevelopmentReplacementPort) {
  const proof = await destination.proveDestination();
  return { mode: 'VERIFY_DEVELOPMENT_DESTINATION' as const, endpointId: proof.endpointId, database: proof.database, destinationWritable: proof.destinationWritable };
}
export async function diagnoseDevelopmentNeutralize(destination: DevelopmentReplacementPort) {
  await destination.proveDestination(); const diagnostic = await destination.diagnoseNeutralize?.();
  if (!diagnostic || !diagnostic.delegateExists || !diagnostic.updateManyAvailable || !diagnostic.fieldKnown) throw new CloneOperationError('DEVELOPMENT_PRISMA_DELEGATE_INVALID', 'neutralize:ContentItem.primaryJourneyContentItemId');
  return { mode: 'DIAGNOSE_DEVELOPMENT_NEUTRALIZE' as const, ...diagnostic };
}
export async function diagnoseDevelopmentNeutralizeTransaction(destination: DevelopmentReplacementPort) {
  const report = await destination.diagnoseNeutralizeTransaction?.(); if (!report) throw new CloneOperationError('DEVELOPMENT_PRISMA_DELEGATE_INVALID', 'diagnose-neutralize-transaction'); return { mode: 'DIAGNOSE_DEVELOPMENT_NEUTRALIZE_TRANSACTION' as const, ...report };
}
export async function diagnoseDevelopmentNeutralizeRawSql(destination: DevelopmentReplacementPort) { const report = await destination.diagnoseNeutralizeRawSql?.(); if (!report) throw new CloneOperationError('DEVELOPMENT_PRISMA_DELEGATE_INVALID', 'diagnose-neutralize-raw-sql'); return { mode: 'DIAGNOSE_DEVELOPMENT_NEUTRALIZE_RAW_SQL' as const, ...report }; }

export async function runCli(createReader: () => ReadOnlySourceReader = () => new ProductionReadOnlySourceReader(), createDestination: () => DevelopmentReplacementPort = () => new PrismaDevelopmentReplacementPort(), args = process.argv.slice(2)) {
  try {
    const replacementRequested = args.includes('--replace-development');
    const verifyDestinationRequested = args.includes('--verify-development-destination');
    const diagnoseNeutralizeRequested = args.includes('--diagnose-development-neutralize');
    const diagnoseTransactionRequested = args.includes('--diagnose-development-neutralize-transaction');
    const diagnoseRawSqlRequested = args.includes('--diagnose-development-neutralize-raw-sql');
    if (replacementRequested && verifyDestinationRequested) throw new Error('UNEXPECTED');
    if (replacementRequested && process.env.CONFIRM_REPLACE_DEVELOPMENT !== 'YES') throw new CloneOperationError('DEVELOPMENT_REPLACEMENT_CONFIRMATION_REQUIRED');
    const report = diagnoseRawSqlRequested ? await diagnoseDevelopmentNeutralizeRawSql(createDestination()) : diagnoseTransactionRequested ? await diagnoseDevelopmentNeutralizeTransaction(createDestination()) : diagnoseNeutralizeRequested ? await diagnoseDevelopmentNeutralize(createDestination()) : verifyDestinationRequested ? await verifyDevelopmentDestination(createDestination()) : replacementRequested ? await replaceDevelopment(createReader(), createDestination()) : await dryRun(createReader());
    console.log(JSON.stringify({ ...report, result: 'PASS' }));
    return 0;
  } catch (error) {
    const result = isCloneOperationError(error) ? { code: error.code, ...(error.phase ? { phase: error.phase } : {}), ...(error.prismaCode ? { prismaCode: error.prismaCode } : {}), ...(error.runtimeCategory ? { runtimeCategory: error.runtimeCategory } : {}), ...(error.jsErrorType ? { jsErrorType: error.jsErrorType } : {}), ...(error.operation ? { operation: error.operation } : {}), ...(error.thrown ?? {}) } : { code: 'UNEXPECTED_CLONE_OPERATION_FAILURE', ...(error && typeof error === 'object' && 'phase' in error && typeof (error as { phase?: unknown }).phase === 'string' ? { phase: (error as { phase: string }).phase } : {}) };
    console.error(JSON.stringify({ result: 'FAIL', ...result }));
    return 1;
  }
}

if (process.argv[1]?.endsWith('clone-production-to-development.ts')) {
  void runCli().then((code) => { process.exitCode = code; });
}
