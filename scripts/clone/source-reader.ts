import type { CloneDataset } from './sanitize';

export type SourceProof = { sourceDatabaseEnvironment: 'production'; sourceMode: 'read_only'; sourceRole: 'not_proven'; sourceTransaction: 'read_only'; sourceReadReplica: 'proven'; vercelIdentityVerified: boolean; neonIdentityVerified: boolean };
export interface ReadOnlySourceReader { readonly kind: 'READ_ONLY_SOURCE'; verify(): Promise<SourceProof>; readAll(): Promise<CloneDataset>; }

export function assertSourceProof(proof: SourceProof) {
  if (proof.sourceDatabaseEnvironment !== 'production' || proof.sourceMode !== 'read_only' || proof.sourceRole !== 'not_proven' || proof.sourceTransaction !== 'read_only' || proof.sourceReadReplica !== 'proven' || !proof.vercelIdentityVerified || !proof.neonIdentityVerified) throw new Error('ENVIRONMENT_MISMATCH');
}
