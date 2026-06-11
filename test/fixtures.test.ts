import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

describe('fixtures', () => {
  it('can load an Apple sample fixture', () => {
    const html = readFileSync(
      join(fixturesDir, 'apple', 'iphone-15-pro-tech-specs.sample.html'),
      'utf8',
    );
    expect(html).toContain('A17 Pro chip');
  });
});
