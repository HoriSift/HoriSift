import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverSourceFiles } from '../../src/scanner/discover.ts';

test('regression: excluded vendor symlink never forces incomplete coverage', async () => {
  const root = await mkdtemp(join(tmpdir(), 'horisift-regression-'));
  try {
    await writeFile(join(root, 'ok.ts'), 'export {}');
    await mkdir(join(root, 'node_modules'));
    await writeFile(join(root, 'node_modules', 'skip.js'), 'bad');
    const out = await discoverSourceFiles(root);
    assert.equal(out.status, 'complete');
    assert.deepEqual(out.files.map(f => f.path), ['ok.ts']);
  } finally { await rm(root, { recursive: true, force: true }); }
});
