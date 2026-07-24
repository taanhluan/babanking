import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import type { EnvironmentSource } from '../src/server/environment-core';

export function loadEnvironmentFiles(
  cwd = process.cwd(),
  target: EnvironmentSource = process.env,
) {
  const explicitKeys = new Set(
    Object.entries(target)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key),
  );

  for (const filename of ['.env', '.env.local']) {
    const filePath = path.join(cwd, filename);
    if (!fs.existsSync(filePath)) continue;
    const values = parseEnv(fs.readFileSync(filePath, 'utf8'));
    for (const [key, value] of Object.entries(values)) {
      if (!explicitKeys.has(key)) target[key] = value;
    }
  }
  return target;
}
