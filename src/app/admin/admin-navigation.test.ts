import { describe, expect, it } from 'vitest';
import { getAdminOperations } from './admin-navigation';
import { isJourneyCmsEnvironmentAllowed } from '@/server/cms/journey-cms-environment-core';

const basePaths = [
  '/admin/memberships',
  '/admin/users',
  '/admin/access-control',
  '/admin/content',
  '/admin/content/translations',
  '/admin/audit',
  '/admin/system/environment',
];

describe('Admin navigation', () => {
  it.each([
    ['development', 'development', true],
    ['preview', 'preview', false],
    ['production', 'production', false],
    ['development', 'production', false],
  ] as const)('shows Journey CMS only for matching Development labels', (app, database, visible) => {
    const operations = getAdminOperations(false, isJourneyCmsEnvironmentAllowed({
      APP_ENV: app,
      DATABASE_ENVIRONMENT: database,
    }));
    expect(operations.some(([, path]) => path === '/admin/contributor')).toBe(visible);
    expect(operations.filter(([, path]) => path !== '/admin/contributor').map(([, path]) => path))
      .toEqual(basePaths);
  });
});
