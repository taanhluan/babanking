import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe('premium route source safety', () => {
  it('does not import static data assets from application routes or the content repository', () => {
    const targets = [...files(join(process.cwd(), 'src/app')), join(process.cwd(), 'src/lib/repository.ts')]
      .filter((path) => path.endsWith('.ts') || path.endsWith('.tsx'));
    for (const path of targets) {
      expect(readFileSync(path, 'utf8'), path).not.toMatch(/from ['"]@\/data\//);
    }
  });
});
