import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assessHorizonRepository,assessHorizonUsage} from '../../src/analysis/risk.ts';

async function fixture(fn){const root=await mkdtemp(join(tmpdir(),'horisift-risk-'));try{return await fn(root)}finally{await rm(root,{recursive:true,force:true})}}
const codes=r=>r.findings.map(f=>f.ruleId);

test('multi-source integration: no source execution; categorized risk with exact locations and sources',()=>fixture(async root=>{
  await mkdir(join(root,'src'));await writeFile(join(root,'src','account.js'),"throw new Error('DONT_EXECUTE');\nfetch('https://horizon.stellar.org/accounts?token=TOP_SECRET');");
  await writeFile(join(root,'src','other.ts'),"fetch('https://horizon.stellar.org/operations/123');\nfetch('https://example.org/payments');");
  const r=await assessHorizonRepository(root);
  assert.equal(r.status,'complete');assert.equal(r.triage,'review-required');assert.equal(r.filesInspected,2);assert.equal(r.root,'.');
  assert.deepEqual(codes(r),['horizon.http.account-list','horizon.http.operation-by-id']);
  assert.equal(r.findings[0].location.start.line,2);
  assert.equal(r.summary.highestSeverity,'high');
  assert.ok(!JSON.stringify(r).includes('TOP_SECRET'));assert.ok(!JSON.stringify(r).includes('DONT_EXECUTE'));
  assert.ok(r.findings.every(f=>f.officialSources[0].url.startsWith('https://developers.stellar.org/')));
}));
test('all findings on a single file can rank high before medium',()=>fixture(async root=>{
  await writeFile(join(root,'a.ts'),"fetch('https://horizon.stellar.org/ledgers');\nfetch('https://horizon.stellar.org/accounts');");
  const r=await assessHorizonRepository(root);
  assert.equal(r.findings[0].ruleId,'horizon.http.account-list');
  assert.equal(r.findings[1].ruleId,'horizon.http.ledger-list');
}));
test('empty repo remains incomplete, never ready',()=>fixture(async root=>{
  const r=await assessHorizonRepository(root);
  assert.equal(r.triage,'incomplete');assert.equal(r.status,'incomplete');assert.equal(r.summary.findings,0);
  assert.ok(r.diagnostics.some(d=>d.code==='NO_SUPPORTED_FILES'));
}));
test('source code with no recognizable Horizon use is no-supported-evidence, not safe migration',()=>fixture(async root=>{
  await writeFile(join(root,'a.js'),"const a = 'horizon'; const harmless=1;");
  const r=await assessHorizonRepository(root);
  assert.equal(r.triage,'no-supported-evidence');assert.equal(r.summary.findings,0);assert.equal(r.status,'complete');
}));
test('unsupported and ignored trees never represent assessed apps',()=>fixture(async root=>{
  await mkdir(join(root,'node_modules'));await writeFile(join(root,'node_modules','pkg.js'),"fetch('https://horizon.stellar.org/payments')");
  await writeFile(join(root,'license.txt'),'not source');
  const r=await assessHorizonRepository(root);
  assert.equal(r.status,'incomplete');assert.equal(r.summary.findings,0);
}));
test('malformed app script never upgrades findings or exposes content',()=>fixture(async root=>{
  await writeFile(join(root,'broken.ts'),"const a=;const SECRET='DO_NOT_LOG';fetch('https://horizon.stellar.org/accounts')");
  const r=await assessHorizonRepository(root);
  assert.equal(r.status,'incomplete');assert.equal(r.summary.findings,0);
  assert.ok(r.diagnostics.some(d=>d.code==='INVALID_SYNTAX'));
  assert.ok(!JSON.stringify(r).includes('DO_NOT_LOG'));
}));
test('dynamic URL remains incomplete across all layers',()=>fixture(async root=>{
  await writeFile(join(root,'dynamic.js'),"const endpoint='https://horizon.stellar.org/' + process.env.KEY;fetch(endpoint);");
  const r=await assessHorizonRepository(root);
  assert.equal(r.status,'incomplete');assert.ok(r.unknowns.length);
  assert.equal(r.triage,'incomplete');assert.equal(r.summary.unknowns,r.unknowns.length);
  assert.ok(!JSON.stringify(r).includes('process.env.KEY'));
}));
test('symlink escape is skipped and incomplete with no target read',()=>fixture(async root=>{
  const external=await mkdtemp(join(tmpdir(),'horisift-risk-outside-'));
  try{await writeFile(join(external,'secrets.ts'),"fetch('https://horizon.stellar.org/operations/777')");
    await writeFile(join(root,'real.ts'),"fetch('https://horizon.stellar.org/accounts')");
    await symlink(join(external,'secrets.ts'),join(root,'leak.ts'),'file');
    const r=await assessHorizonRepository(root);
    assert.equal(r.status,'incomplete');assert.ok(r.diagnostics.some(d=>d.code==='SYMLINK_SKIPPED'));
    assert.equal(r.summary.findings,1);assert.ok(!JSON.stringify(r).includes('secrets.ts'));
  }finally{await rm(external,{recursive:true,force:true})}
}));
test('per-file byte limit prevents unsafe partial risk conclusions',()=>fixture(async root=>{
  await writeFile(join(root,'small.js'),"fetch('https://horizon.stellar.org/accounts');");
  await writeFile(join(root,'large.js'),"fetch('https://horizon.stellar.org/payments');".repeat(50));
  const r=await assessHorizonRepository(root,{limits:{maxFileBytes:100}});
  assert.equal(r.status,'incomplete');assert.ok(r.diagnostics.some(d=>d.code==='FILE_TOO_LARGE'));
  assert.equal(r.summary.findings,1);
}));
test('file cap and depth cap propagate incomplete diagnostics',()=>fixture(async root=>{
  await mkdir(join(root,'level'));await writeFile(join(root,'a.ts'),"fetch('https://horizon.stellar.org/accounts')");
  await writeFile(join(root,'level','b.ts'),"fetch('https://horizon.stellar.org/payments')");
  const limit=await assessHorizonRepository(root,{limits:{maxFiles:1}});
  assert.equal(limit.status,'incomplete');assert.ok(limit.diagnostics.some(d=>d.code==='FILE_LIMIT'));
  const depth=await assessHorizonRepository(root,{limits:{maxDepth:0}});
  assert.equal(depth.status,'incomplete');assert.ok(depth.diagnostics.some(d=>d.code==='DEPTH_LIMIT'));
}));
test('excluding folders leads to scoped assessment, never claims total app coverage',()=>fixture(async root=>{
  await mkdir(join(root,'src'));await writeFile(join(root,'src','a.ts'),"fetch('https://horizon.stellar.org/accounts')");
  await writeFile(join(root,'b.ts'),"fetch('https://horizon.stellar.org/transactions')");
  const r=await assessHorizonRepository(root,{excludePaths:['src']});
  assert.equal(r.summary.findings,1);assert.equal(r.findings[0].ruleId,'horizon.http.transactions-list');
}));
test('Unicode relative paths and positions are stable',()=>fixture(async root=>{
  await mkdir(join(root,'résumé'));await writeFile(join(root,'résumé','🔭.tsx'),"// look\nfetch('https://horizon.stellar.org/accounts');");
  const r=await assessHorizonRepository(root);
  assert.equal(r.status,'complete');assert.equal(r.findings[0].location.file,'résumé/🔭.tsx');assert.equal(r.findings[0].location.start.line,2);
}));
test('repeat runs yield byte-identical normalized output',()=>fixture(async root=>{
  await writeFile(join(root,'a.ts'),"fetch('https://horizon.stellar.org/effects')");
  await writeFile(join(root,'b.ts'),"fetch('https://horizon.stellar.org/accounts')");
  const a=await assessHorizonRepository(root),b=await assessHorizonRepository(root);
  assert.equal(JSON.stringify(a),JSON.stringify(b));
}));
test('no timestamp, absolute machine path or raw source in assessment',()=>fixture(async root=>{
  await writeFile(join(root,'abc.js'),"fetch('https://horizon.stellar.org/payments?password=NOPE')");
  const s=JSON.stringify(await assessHorizonRepository(root));
  assert.ok(!s.includes(root));assert.ok(!s.includes('NOPE'));
  assert.ok(!s.includes('scannedAt'));assert.ok(!s.includes('elapsedMilliseconds'));
}));
test('invalid root emits documented discovery error, not successful empty assessment',async()=>{
  await assert.rejects(()=>assessHorizonRepository('/this-horisift-dir-does-not-exist'),/Scan root/i);
});
test('review-required vs incomplete precedence with simultaneous known and unknown',()=>{
  const r=assessHorizonUsage('src/mixed.ts',"fetch('https://horizon.stellar.org/accounts');fetch('https://horizon.stellar.org/' + suffix);");
  assert.equal(r.triage,'incomplete');assert.equal(r.summary.findings,1);assert.ok(r.unknowns.length);
});
