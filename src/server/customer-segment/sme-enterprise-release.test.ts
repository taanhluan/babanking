import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RETAIL_PRODUCTION_GUARD_HASH, SME_ENTERPRISE_RELEASE_ID, smeEnterpriseReleaseSchema } from './sme-enterprise-release';

describe('SME and Enterprise immutable release', () => {
  const artifact = smeEnterpriseReleaseSchema.parse(JSON.parse(fs.readFileSync(path.resolve(process.cwd(), `release/customer-segments/${SME_ENTERPRISE_RELEASE_ID}.json`), 'utf8')));

  it('contains only the two target segments and 20 independently scoped journeys', () => {
    expect(artifact.segments.map((entry) => entry.slug).sort()).toEqual(['enterprise-banking', 'sme']);
    expect(artifact.journeys).toHaveLength(20);
    expect(artifact.journeys.filter((entry) => entry.segment === 'sme')).toHaveLength(10);
    expect(artifact.journeys.filter((entry) => entry.segment === 'enterprise-banking')).toHaveLength(10);
    expect(artifact.journeys.every((entry) => (entry.content.modules ?? []).length === 13)).toBe(true);
  });

  it('contains a Retail guard but no Retail mutation payload', () => {
    expect(artifact.retailGuard).toEqual({ slug: 'retail-banking', productionHash: RETAIL_PRODUCTION_GUARD_HASH });
    expect(JSON.stringify(artifact.segments)).not.toContain('"slug":"retail-banking"');
  });
});
