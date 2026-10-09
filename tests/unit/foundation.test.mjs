import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFoundation } from '../../scripts/check-foundation.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
function withCopy(fn) {
  const tmp = mkdtempSync(join(tmpdir(), 'horisift-foundation-'));
  try {
    cpSync(root, tmp, { recursive: true, filter: (src) => !src.split(/[\\/]/).some((part) => part === 'node_modules' || part === 'dist') });
    return fn(tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
test('foundation structure validates without calling a scanner', () => {
  assert.deepEqual(validateFoundation(root), []);
});
test('missing mandatory file is reported', () => withCopy((tmp) => {
  rmSync(join(tmp, 'AGENTS.md'));
  assert.ok(validateFoundation(tmp).some((e) => e.includes('AGENTS.md')));
}));
test('internal phase number in public README is rejected', () => withCopy((tmp) => {
  writeFileSync(join(tmp, 'README.md'), readFileSync(join(tmp, 'README.md'), 'utf8') + '\nPhase 14 delivered\n');
  assert.ok(validateFoundation(tmp).some((e) => e.includes('Public README')));
}));
test('missing phase evidence field is rejected', () => withCopy((tmp) => {
  const path = join(tmp, 'docs/PHASE_BUILDS.md');
  writeFileSync(path, readFileSync(path, 'utf8').replace('- **Evidence links:** None verified yet.', ''));
  assert.ok(validateFoundation(tmp).some((e) => e.includes('missing Evidence links')));
}));
test('malformed package lock metadata is rejected', () => withCopy((tmp) => {
  const path = join(tmp, 'package-lock.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  data.version = '100.0.0';
  writeFileSync(path, JSON.stringify(data));
  assert.ok(validateFoundation(tmp).some((e) => e.includes('Package lock out of sync')));
}));
