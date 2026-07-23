import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores(['.next/**', '.open-next/**', '.vinext/**', '.wrangler/**', 'dist/**', 'node_modules/**', 'next-env.d.ts']),
]);
