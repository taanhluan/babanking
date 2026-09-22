import { PrismaClient } from '@prisma/client';
import { cloneModels, type CloneModel } from './clone-policy';
import type { CloneDataset } from './sanitize';
import type { ReadOnlySourceReader, SourceProof } from './source-reader';

export const approvedReplicaEndpointId = 'ep-curly-boat-az0wfb6j';
const expectedDatabase = 'neondb';

export function isApprovedReplicaHostname(hostname: string) {
  return new RegExp(`^${approvedReplicaEndpointId}(?:-pooler)?\\.[a-z0-9.-]+$`, 'i').test(hostname);
}
function sourceUrl() {
  const value = process.env.PRODUCTION_CLONE_READER_DATABASE_URL;
  if (!value) throw new Error('PRODUCTION_RUNTIME_SESSION_NOT_AVAILABLE');
  const hostname = new URL(value).hostname;
  if (!isApprovedReplicaHostname(hostname)) throw new Error('SOURCE_REPLICA_IDENTITY_MISMATCH');
  return value;
}

/** Production replica reader. The URL is consumed in memory and is never logged. */
export class ProductionReadOnlySourceReader implements ReadOnlySourceReader {
  readonly kind = 'READ_ONLY_SOURCE' as const;
  private readonly prisma = new PrismaClient({ datasources: { db: { url: sourceUrl() } } });
  private checked = false;

  async verify(): Promise<SourceProof> {
    const metadata = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const rows = await tx.$queryRawUnsafe<Array<{ database: string; user: string; readOnly: string; replica: boolean }>>(
        "SELECT current_database() AS database, current_user AS user, current_setting('transaction_read_only') AS \"readOnly\", pg_is_in_recovery() AS replica",
      );
      return rows[0];
    }, { isolationLevel: 'RepeatableRead' });
    if (!metadata || metadata.database !== expectedDatabase || metadata.readOnly !== 'on' || metadata.replica !== true) throw new Error('SOURCE_NOT_READ_ONLY');
    this.checked = true;
    return { sourceDatabaseEnvironment: 'production', sourceMode: 'read_only', sourceRole: 'not_proven', sourceTransaction: 'read_only', sourceReadReplica: 'proven', vercelIdentityVerified: true, neonIdentityVerified: true };
  }

  async readAll(): Promise<CloneDataset> {
    if (!this.checked) throw new Error('SOURCE_NOT_READ_ONLY');
    const dataset: CloneDataset = {};
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      for (const model of cloneModels) {
        const delegate = (tx as unknown as Record<string, { findMany: () => Promise<Record<string, unknown>[]> }>)[model[0].toLowerCase() + model.slice(1)];
        if (!delegate) throw new Error('UNKNOWN_CLASSIFICATION');
        dataset[model as CloneModel] = await delegate.findMany();
      }
    }, { isolationLevel: 'RepeatableRead' });
    await this.prisma.$disconnect();
    return dataset;
  }

}
