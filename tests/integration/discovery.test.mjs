import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink, lstat, opendir, realpath, open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { discoverSourceFiles, DEFAULT_LIMITS, DiscoveryInputError } from '../../src/scanner/discover.ts';

async function fixture(fn) {
  const root = await mkdtemp(join(tmpdir(), 'horisift-discovery-'));
  try {
    const put = async (name, contents = 'x') => {
      const path = join(root, name);
      await mkdir(resolve(path, '..'), { recursive: true });
      await writeFile(path, contents);
      return path;
    };
    return await fn({ root, put });
  } finally { await rm(root, { recursive: true, force: true }); }
}
const codes = result => result.diagnostics.map(x => x.code);

test('enumerates all eight supported extensions, skips build/dependency folders and declaration files', async () => fixture(async ({ root, put }) => {
  const inputs = ['a.js', 'a.jsx', 'a.mjs', 'a.cjs', 'a.ts', 'a.tsx', 'a.mts', 'a.cts'];
  for (const name of inputs) await put(`src/${name}`);
  for (const name of ['README.md', 'a.d.ts', 'a.d.mts', 'a.d.cts', 'foo.json', 'src/a.ts.map', 'node_modules/dep.js', 'dist/a.ts', 'build/generated.js', '.git/hook.js', 'coverage/c.js']) await put(name);
  const out = await discoverSourceFiles(root);
  assert.deepEqual(out.files.map(x => x.path), inputs.map(x => `src/${x}`).sort());
  assert.equal(out.status, 'complete');
  assert.equal(out.stats.filesIncluded, 8);
  assert.equal(out.stats.totalBytes, 8);
  assert.deepEqual(out.diagnostics, []);
}));

test('outputs deterministic stable relative paths and no absolute root or code contents', async () => fixture(async ({ root, put }) => {
  await put('z/βeta.ts', 'VERY_SENSITIVE_SOURCE_CONTENT');
  await put('a/🛰️.jsx', 'token=DO_NOT_SHOW');
  const once = await discoverSourceFiles(root);
  const twice = await discoverSourceFiles(root);
  assert.equal(JSON.stringify(once), JSON.stringify(twice));
  assert.deepEqual(once.files.map(x => x.path), ['a/🛰️.jsx', 'z/βeta.ts']);
  assert.ok(!JSON.stringify(once).includes(root));
  assert.ok(!JSON.stringify(once).includes('VERY_SENSITIVE_SOURCE_CONTENT'));
  assert.ok(!JSON.stringify(once).includes('DO_NOT_SHOW'));
  assert.equal(once.root, '.');
}));

test('empty and unsupported-only directories are explicitly incomplete', async () => fixture(async ({ root, put }) => {
  let out = await discoverSourceFiles(root);
  assert.equal(out.status, 'incomplete');
  assert.deepEqual(codes(out), ['NO_SUPPORTED_FILES']);
  await put('image.png', 'data');
  out = await discoverSourceFiles(root);
  assert.equal(out.files.length, 0);
  assert.deepEqual(codes(out), ['NO_SUPPORTED_FILES']);
}));

test('custom root-relative literal exclusions apply to file and subtree without glob interpretation', async () => fixture(async ({ root, put }) => {
  await put('src/a.js'); await put('src/private/secret.ts'); await put('tests/internal.ts');
  const out = await discoverSourceFiles(root, { excludePaths: ['src/private', 'tests/internal.ts'] });
  assert.deepEqual(out.files.map(x => x.path), ['src/a.js']);
  assert.equal(out.status, 'complete');
}));

test('rejects invalid roots and configuration without leaking input paths', async () => fixture(async ({ root, put }) => {
  const file = await put('text.js');
  for (const badRoot of ['', `${root}/does-not-exist`, file, null]) {
    await assert.rejects(() => discoverSourceFiles(badRoot), e => e instanceof DiscoveryInputError && e.code === 'INVALID_ROOT' && !e.message.includes(root));
  }
  for (const options of [
    { limits: { maxDepth: -1 } }, { limits: { maxFiles: 0 } },
    { limits: { maxTotalBytes: 1.5 } }, { limits: { unknownLimit: 99 } },
    { excludePaths: ['../outside'] }, { excludePaths: ['/absolute'] },
    { excludePaths: ['src/../../outside'] }, { excludePaths: ['a\\b'] },
    { excludePaths: ['x//y'] }, { excludePaths: [''] }, { excludePaths: 'src' },
  ]) {
    await assert.rejects(() => discoverSourceFiles(root, options), e => e instanceof DiscoveryInputError && e.code === 'INVALID_CONFIG');
  }
}));

test('root can have maximum depth zero; deeper trees produce honest diagnostics', async () => fixture(async ({ root, put }) => {
  await put('top.ts'); await put('src/b.ts');
  const out = await discoverSourceFiles(root, { limits: { maxDepth: 0 } });
  assert.deepEqual(out.files.map(x => x.path), ['top.ts']);
  assert.ok(codes(out).includes('DEPTH_LIMIT'));
  assert.equal(out.status, 'incomplete');
}));

test('per-file limit is inclusive and oversized source is skipped', async () => fixture(async ({ root, put }) => {
  await put('small.js', 'abc'); await put('large.js', 'abcd');
  const out = await discoverSourceFiles(root, { limits: { maxFileBytes: 3 } });
  assert.deepEqual(out.files, [{ path: 'small.js', sizeBytes: 3 }]);
  assert.ok(codes(out).includes('FILE_TOO_LARGE'));
  assert.equal(out.status, 'incomplete');
}));

test('total byte limit is inclusive, records incomplete rather than claiming complete', async () => fixture(async ({ root, put }) => {
  await put('a.ts', 'abc'); await put('b.ts', 'd');
  const out = await discoverSourceFiles(root, { limits: { maxTotalBytes: 3 } });
  assert.deepEqual(out.files, [{ path: 'a.ts', sizeBytes: 3 }]);
  assert.deepEqual(codes(out), ['TOTAL_BYTES_LIMIT']);
}));

test('file count limit is enforced before adding an additional source', async () => fixture(async ({ root, put }) => {
  await put('a.js'); await put('b.js');
  const out = await discoverSourceFiles(root, { limits: { maxFiles: 1 } });
  assert.deepEqual(out.files.map(x => x.path), ['a.js']);
  assert.deepEqual(codes(out), ['FILE_LIMIT']);
}));

test('entry budget bounds traversal and returns incomplete with no unsupported success claims', async () => fixture(async ({ root, put }) => {
  for (let i = 0; i < 6; i++) await put(`src/${i}.js`);
  const out = await discoverSourceFiles(root, { limits: { maxEntries: 3 } });
  assert.ok(out.stats.entriesVisited <= 3);
  assert.equal(out.status, 'incomplete');
  assert.ok(codes(out).includes('ENTRY_LIMIT'));
}));

test('directory budget bounds traversals and records skipped directories', async () => fixture(async ({ root, put }) => {
  await put('a/a.js'); await put('b/b.js');
  const out = await discoverSourceFiles(root, { limits: { maxDirectories: 2 } });
  assert.deepEqual(out.files.map(x => x.path), ['a/a.js']);
  assert.equal(out.stats.directoriesVisited, 2);
  assert.ok(codes(out).includes('DIRECTORY_LIMIT'));
}));

test('safe output path budget rejects long path without revealing or resolving it', async () => fixture(async ({ root, put }) => {
  await put('ok.js'); await put('sensitive-name-file.ts');
  const out = await discoverSourceFiles(root, { limits: { maxPathLength: 5 } });
  assert.deepEqual(out.files.map(x => x.path), ['ok.js']);
  assert.ok(codes(out).includes('PATH_TOO_LONG'));
  assert.ok(!JSON.stringify(out).includes('sensitive-name'));
}));

test('does not evaluate or run untrusted source while discovering it', async () => fixture(async ({ root, put }) => {
  const marker = join(root, 'executed.txt');
  await put('payload.js', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'BAD');`);
  const out = await discoverSourceFiles(root);
  assert.equal(out.status, 'complete');
  await assert.rejects(() => lstat(marker), { code: 'ENOENT' });
}));

test('directory access errors are reported through injected deterministic IO boundary', async () => fixture(async ({ root, put }) => {
  await put('good/a.ts'); await put('blocked/b.ts');
  const out = await discoverSourceFiles(root, { io: { opendir: async path => {
    if (path.endsWith('blocked')) throw Object.assign(new Error('SECRET PATH DATA'), { code: 'EACCES' });
    return opendir(path);
  } } });
  assert.equal(out.status, 'incomplete');
  assert.deepEqual(out.files.map(x => x.path), ['good/a.ts']);
  assert.ok(out.diagnostics.some(d => d.code === 'DIRECTORY_UNREADABLE' && d.file === 'blocked'));
  assert.ok(!JSON.stringify(out).includes('SECRET PATH DATA'));
}));

test('file read errors are recorded, without leaking operating-system error details', async () => fixture(async ({ root, put }) => {
  await put('private.ts'); await put('visible.js');
  const out = await discoverSourceFiles(root, { io: { open: async (path, flags) => {
    if (path.endsWith('private.ts')) throw Object.assign(new Error('token=ULTRA_SECRET'), { code: 'EACCES' });
    return open(path, flags);
  } } });
  assert.deepEqual(out.files.map(x => x.path), ['visible.js']);
  assert.ok(out.diagnostics.some(d => d.code === 'FILE_UNREADABLE' && d.file === 'private.ts'));
  assert.ok(!JSON.stringify(out).includes('ULTRA_SECRET'));
}));

test('canonical path outside of root is rejected, even if the directory entry looked like a normal file', async () => fixture(async ({ root, put }) => {
  await put('a.js'); await put('b.ts');
  const out = await discoverSourceFiles(root, { io: { realpath: async path => path.endsWith('b.ts') ? resolve(root, '..', 'outside.ts') : realpath(path) } });
  assert.deepEqual(out.files.map(x => x.path), ['a.js']);
  assert.ok(out.diagnostics.some(x => x.code === 'PATH_OUTSIDE_ROOT' && x.file === 'b.ts'));
}));

test('symlinked source and symlinked directories are skipped without reading targets or looping', async t => fixture(async ({ root, put }) => {
  const outside = await mkdtemp(join(tmpdir(), 'horisift-outside-'));
  try {
    await put('legit.ts');
    await writeFile(join(outside, 'outside.ts'), 'untrusted');
    await mkdir(join(root, 'nested'));
    try {
      await symlink(outside, join(root, 'foreign'), process.platform === 'win32' ? 'junction' : 'dir');
      await symlink(join(root, 'nested'), join(root, 'nested', 'loop'), process.platform === 'win32' ? 'junction' : 'dir');
      await symlink(join(outside, 'outside.ts'), join(root, 'external.ts'), 'file');
    } catch (e) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(e?.code)) { t.diagnostic('symlinks unavailable on current runner'); return; }
      throw e;
    }
    const out = await discoverSourceFiles(root);
    assert.deepEqual(out.files.map(x => x.path), ['legit.ts']);
    assert.equal(out.status, 'incomplete');
    assert.equal(codes(out).filter(x => x === 'SYMLINK_SKIPPED').length, 3);
    assert.equal(out.stats.directoriesVisited, 2);
  } finally { await rm(outside, { recursive: true, force: true }); }
}));

test('root itself cannot be a symlink', async t => fixture(async ({ root }) => {
  const link = `${root}-link`;
  try {
    try { await symlink(root, link, process.platform === 'win32' ? 'junction' : 'dir'); }
    catch (e) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes(e?.code)) { t.diagnostic('symlinks unavailable'); return; } throw e; }
    await assert.rejects(() => discoverSourceFiles(link), { code: 'INVALID_ROOT' });
  } finally { await rm(link, { force: true, recursive: false }); }
}));

test('default budget constants are explicit and do not depend on filesystem state', () => {
  assert.equal(DEFAULT_LIMITS.maxDepth, 32);
  assert.equal(DEFAULT_LIMITS.maxFiles, 20_000);
  assert.equal(DEFAULT_LIMITS.maxTotalBytes, 64 * 1024 * 1024);
});
