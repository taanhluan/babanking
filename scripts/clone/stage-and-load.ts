import type { CloneDataset } from './sanitize';

export type ReplacementGates = { developmentReplacementAuthorized: boolean; targetIdentityVerified: boolean; sanitizedDatasetValid: boolean; stagingValid: boolean; sourceReadOnlyVerified: boolean };
export interface DevelopmentStagingTarget { stage(dataset: CloneDataset): Promise<void>; validate(): Promise<void>; replaceDevelopment(): Promise<void>; }
export function assertReplacementGates(gates: ReplacementGates) { if (!Object.values(gates).every(Boolean)) throw new Error('DESTRUCTIVE_REPLACEMENT_NOT_AUTHORIZED'); }
export async function stageOnly(target: DevelopmentStagingTarget, dataset: CloneDataset) { await target.stage(dataset); await target.validate(); }
export async function replaceOnlyWhenAuthorized(target: DevelopmentStagingTarget, gates: ReplacementGates) { assertReplacementGates(gates); await target.replaceDevelopment(); }
