import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assessHorizonRepository } from '../../src/analysis/risk.ts';
import { renderScanJson } from '../../src/reports/render.ts';
import { checkedSource, parseExampleArgs, readCorpus, runExample, stageExample } from '../../scripts/public-example.mjs';

const entries = readCorpus().entries;
const thisRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const goldenDir = resolve(thisRoot, 'tests/fixtures/public-upstream');
const sample = fn => {
  const root = mkdtempSync(join(tmpdir(), 'horisift-public-corpus-test-'));
  try { return fn(root); } finally { rmSync(root, { recursive:true, force:true }); }
};
const orders = (a, b) => a < b ? -1 : a > b ? 1 : 0;

test('public corpus contains three actual upstream repositories with two modern detections, historical miss and control', () => {
  assert.equal(entries.length, 4);
  assert.equal(new Set(entries.map(x => x.repo)).size, 3);
  assert.equal(entries.filter(x => x.expectedFindings > 0).length, 2);
  assert.equal(entries.filter(x => x.historicalGap).length, 1);
  assert.equal(entries.filter(x => x.expectedFindings === 0 && !x.historicalGap).length, 1);
});

test('every public upstream snapshot is byte-identical to a pinned upstream Git blob and SHA-256', () => {
  for (const row of entries) {
    assert.equal(checkedSource(row).length, row.byteLength);
    assert.match(row.sourceUrl, new RegExp(`/blob/${row.commit}/`));
  }
});

test('public source provenance cannot be changed without failing checksum and size verification', () => {
  const original = entries[0];
  assert.throws(() => checkedSource({ ...original, sha256: '0'.repeat(64) }), /pinned source/);
  assert.throws(() => checkedSource({ ...original, gitBlobSha1: '0'.repeat(40) }), /pinned source/);
  assert.throws(() => checkedSource({ ...original, byteLength: original.byteLength + 1 }), /pinned source/);
  assert.throws(() => checkedSource({ ...original, snapshot: '../README.md' }), /Unsafe/);
});

test('public sample command refuses unrecognized names, options and shell-like arguments', () => {
  for (const args of [[], ['../../bad'], ['unknown-sample'], ['axelar-faucet','--bad'],
    ['axelar-faucet','--format','yaml'], ['axelar-faucet','--allow-incomplete','--allow-incomplete'],
    ['axelar-faucet','--format','json','--format','text']]) {
    assert.throws(() => {
      const a = parseExampleArgs(args);
      if (!entries.some(row => row.id === a.id)) throw new Error('Unknown');
    });
  }
});

for (const row of entries) {
  test(`pinned public ${row.id}: actual assessment and documented evidence match`, async () => {
    const root = await import('node:fs/promises').then(fs => fs.mkdtemp(join(tmpdir(), 'horisift-real-source-')));
    try {
      stageExample(row, root);
      const assessed = await assessHorizonRepository(root);
      assert.equal(assessed.filesInspected, 1);
      assert.equal(assessed.status, row.expectedStatus);
      assert.equal(assessed.summary.findings, row.expectedFindings);
      assert.deepEqual([...new Set(assessed.findings.map(f => f.ruleId))].sort(orders), [...row.expectedRules].sort(orders));
      assert.deepEqual([...new Set(assessed.findings.map(f => f.detectorPattern))].sort(orders), [...row.expectedPatterns].sort(orders));
      assert.deepEqual(assessed.unknowns.map(u => u.code).sort(orders), [...row.expectedUnknowns].sort(orders));
      assert.ok(assessed.findings.every(f => f.location.file === row.upstreamPath));
      const json = renderScanJson(assessed, '0.0.0');
      assert.equal(json, readFileSync(resolve(goldenDir, `${row.id}.json`), 'utf8'));
      assert.ok(!json.includes(root));
      assert.doesNotMatch(json, /SOROSWAP_ADMIN_SECRET_KEY|keypair\.secret|Private key|Bearer |TOP_SECRET/);
      if (row.historicalGap) {
        assert.match(checkedSource(row).toString('utf8'), /StellarSdk\.Server\("https:\/\/horizon\.stellar\.org"\)/);
        assert.equal(assessed.triage, 'no-supported-evidence');
      }
    } finally { await import('node:fs/promises').then(fs => fs.rm(root, { recursive:true, force:true })); }
  });
  test(`pinned public ${row.id}: actual CLI exits correctly, preserves JSON and stays local`, () => {
    const result = spawnSync(process.execPath, [resolve(thisRoot, 'scripts/public-example.mjs'), row.id, '--format', 'json'],
      { encoding:'utf8', shell:false, timeout:30000, maxBuffer:5*1024*1024 });
    assert.equal(result.status, row.expectedExit, result.stderr);
    assert.equal(result.stdout, readFileSync(resolve(goldenDir, `${row.id}.json`), 'utf8'));
    assert.doesNotMatch(result.stdout, /horisift-public-example-|sk_live_|TOP_SECRET/);
  });
}

test('allow-incomplete explicitly preserves the real corpus uncertain status', () => {
  const result = spawnSync(process.execPath, [resolve(thisRoot, 'scripts/public-example.mjs'), 'axelar-faucet', '--allow-incomplete'],
    {encoding:'utf8',shell:false,timeout:30000});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, 'incomplete');
});

test('historical upstream source is an evidenced false negative, not evidence of a Horizon-free app', () => {
  const historical = entries.find(x => x.historicalGap);
  assert.ok(historical);
  const content = checkedSource(historical).toString('utf8');
  assert.ok(content.includes('import StellarSdk from "stellar-sdk"'));
  assert.ok(content.includes('new StellarSdk.Server("https://horizon.stellar.org")'));
  assert.equal(historical.expectedFindings, 0);
  assert.equal(historical.expectedStatus, 'complete');
});

test('sample runner does not run arbitrary target JavaScript and never runs shell syntax', () => {
  const output = { stdout:[], stderr:[] };
  const result = runExample(['unknown-id'], { stdout:x=>output.stdout.push(x), stderr:x=>output.stderr.push(x) });
  assert.equal(result, 3);
  assert.equal(output.stdout.join(''), '');
  assert.doesNotMatch(output.stderr.join(''), /'use strict'|processCommand|horizon-stellar/);
});
