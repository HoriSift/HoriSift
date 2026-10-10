/**
 * Reproduce a pinned public-source example without fetching or executing it.
 * Samples are redistributed only with their notices and a checked git blob
 * identity. The target application's dependencies are never installed.
 */
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const CORPUS_ROOT = resolve(ROOT, 'tests/fixtures/public-upstream');
const manifestFile = resolve(CORPUS_ROOT, 'manifest.json');
const idPattern = /^[a-z][a-z0-9-]{2,60}$/;
const pathPattern = /^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:js|jsx|cjs|mjs|ts|tsx|cts|mts)$/;

export function readCorpus() {
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries) || manifest.entries.length !== 4) {
    throw new Error('Invalid pinned public-source corpus manifest.');
  }
  const ids = new Set();
  for (const row of manifest.entries) {
    if (!idPattern.test(row.id) || ids.has(row.id) || !pathPattern.test(row.upstreamPath) ||
        !/^[a-zA-Z0-9-]+\.(?:js|ts)\.source$/.test(row.snapshot) ||
        !/^[a-f0-9]{40}$/.test(row.commit) || !/^[a-f0-9]{40}$/.test(row.gitBlobSha1) ||
        !/^[a-f0-9]{64}$/.test(row.sha256) || !['MIT', 'Apache-2.0'].includes(row.license) ||
        !/^[a-z0-9-]+\/[a-z0-9-]+$/i.test(row.repo) ||
        row.sourceUrl !== `https://github.com/${row.repo}/blob/${row.commit}/${row.upstreamPath}` ||
        row.licenseUrl !== `https://github.com/${row.repo}/blob/${row.commit}/LICENSE`) {
      throw new Error('Invalid pinned public-source corpus entry.');
    }
    ids.add(row.id);
  }
  return manifest;
}

export function checkedSource(row) {
  const file = resolve(CORPUS_ROOT, row.snapshot);
  if (dirname(file) !== CORPUS_ROOT) throw new Error('Unsafe public sample path.');
  const bytes = readFileSync(file);
  if (bytes.length !== row.byteLength || bytes.length > 32768 ||
      createHash('sha256').update(bytes).digest('hex') !== row.sha256 ||
      createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') !== row.gitBlobSha1 ||
      bytes.toString('utf8').includes('\ufffd')) {
    throw new Error('Public sample differs from its pinned source blob.');
  }
  return bytes;
}

export function stageExample(row, workDir) {
  const bytes = checkedSource(row);
  const path = resolve(workDir, row.upstreamPath);
  if (!path.startsWith(resolve(workDir) + (process.platform === 'win32' ? '\\' : '/'))) {
    throw new Error('Unsafe public example path.');
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes, { flag: 'wx' });
}

export function parseExampleArgs(argv) {
  if (argv.length < 1 || argv.length > 4 || !idPattern.test(argv[0])) {
    throw new Error('Use: node scripts/public-example.mjs <sample-id> [--format text|json] [--allow-incomplete]');
  }
  let format = 'json', allowIncomplete = false, seenFormat = false;
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--format' && !seenFormat && (argv[i + 1] === 'json' || argv[i + 1] === 'text')) {
      format = argv[++i]; seenFormat = true;
    } else if (argv[i] === '--allow-incomplete' && !allowIncomplete) allowIncomplete = true;
    else throw new Error('Invalid public example arguments.');
  }
  return { id: argv[0], format, allowIncomplete };
}

export function runExample(argv, writer = { stdout: s => process.stdout.write(s), stderr: s => process.stderr.write(s) }) {
  let root;
  try {
    const args = parseExampleArgs(argv);
    const row = readCorpus().entries.find(item => item.id === args.id);
    if (!row) throw new Error('Unknown pinned public sample.');
    root = mkdtempSync(join(tmpdir(), 'horisift-public-example-'));
    stageExample(row, root);
    const runner = resolve(ROOT, 'bin/horisift.mjs');
    const cliArgs = [runner, 'scan', root, '--format', args.format];
    if (args.allowIncomplete) cliArgs.push('--allow-incomplete');
    const result = spawnSync(process.execPath, cliArgs, {
      encoding: 'utf8', shell: false, maxBuffer: 4 * 1024 * 1024, timeout: 30000,
    });
    if (result.error) throw new Error('Pinned example scanner could not complete.');
    writer.stdout(result.stdout ?? '');
    // Node 22 may emit an experimental stripping warning to stderr, not to JSON.
    if (result.stderr) writer.stderr(result.stderr);
    return Number.isInteger(result.status) ? result.status : 3;
  } catch {
    writer.stderr('Could not reproduce the pinned example safely.\n');
    return 3;
  } finally {
    if (root) rmSync(root, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runExample(process.argv.slice(2));
}
