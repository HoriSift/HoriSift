/** Explicit stress suite: run once on Ubuntu/Node 24 CI, not in six parallel jobs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {mkdir, mkdtemp, writeFile, rm, symlink, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {discoverSourceFiles, DEFAULT_LIMITS} from '../../src/scanner/discover.ts';
import {readSourceFile} from '../../src/parser/read.ts';
import {assessHorizonRepository, assessHorizonUsage} from '../../src/analysis/risk.ts';
import {renderScanJson} from '../../src/reports/render.ts';

const withTemp = async(fn)=>{const root=await mkdtemp(join(tmpdir(),'horisift-stress-'));try{return await fn(root)}finally{await rm(root,{recursive:true,force:true})}};
const fakeTree=(count)=>{
  const root='/synthetic-fixture-root';
  const directory={isDirectory:()=>true,isSymbolicLink:()=>false,isFile:()=>false,size:0};
  const file={isDirectory:()=>false,isSymbolicLink:()=>false,isFile:()=>true,size:1};
  return {root,io:{
    realpath: async p=>p,
    lstat: async p=>p===root?directory:file,
    open: async()=>({stat:async()=>file,close:async()=>{}}),
    opendir: async()=>({async *[Symbol.asyncIterator](){for(let i=count-1;i>=0;i--)yield {name:`f${String(i).padStart(5,'0')}.ts`};}})
  }};
};

test('20,001 synthetic files respect 20,000 default file cap, preserving partial work', {timeout:45000},async()=>{
  assert.equal(DEFAULT_LIMITS.maxFiles,20_000);
  const {root,io}=fakeTree(20_001);const start=performance.now();
  const out=await discoverSourceFiles(root,{io});const elapsed=Math.round(performance.now()-start);
  console.log(`stress metric: mock-file-cap entries=20001 included=${out.files.length} durationMs=${elapsed}`);
  assert.equal(out.status,'incomplete');assert.equal(out.files.length,20_000);assert.equal(out.stats.filesIncluded,20_000);
  assert.ok(out.diagnostics.some(x=>x.code==='FILE_LIMIT'));
  assert.deepEqual(out.files.slice(0,2).map(x=>x.path),['f00000.ts','f00001.ts']);
  assert.equal(out.files.at(-1).path,'f19999.ts');
  assert.ok(elapsed<30_000,`File-count mock unexpectedly slower than 30s: ${elapsed}ms`);
});

test('100,000 entry boundary never examines the next synthetic entry', {timeout:45000},async()=>{
  const {root,io}=fakeTree(100_005);const start=performance.now();
  const out=await discoverSourceFiles(root,{io,limits:{maxEntries:100_000,maxFiles:20_000}});
  const elapsed=Math.round(performance.now()-start);
  console.log(`stress metric: mocked-entry-cap visited=${out.stats.entriesVisited} elapsedMs=${elapsed}`);
  assert.equal(out.status,'incomplete');assert.equal(out.stats.entriesVisited,100_000);
  assert.ok(out.diagnostics.some(x=>x.code==='ENTRY_LIMIT'));
  // Discovery stops while reading directory, before it processes its buffered entries.
  assert.equal(out.files.length,0);
  assert.ok(elapsed<30_000);
});

test('real filesystem with 256 JS/TS sources stays bounded and output is stable', {timeout:45000},()=>withTemp(async root=>{
  await mkdir(join(root,'src'));const count=256;
  const source="import {Horizon} from '@stellar/stellar-sdk';\nconst c = new Horizon.Server('https://horizon.stellar.org');\nc.loadAccount('GABC');\n";
  for(let i=0;i<count;i++)await writeFile(join(root,'src',`file${String(i).padStart(3,'0')}.ts`),source);
  const start=performance.now();const out=await assessHorizonRepository(root);
  const elapsed=Math.round(performance.now()-start);
  console.log(`stress metric: real-files=${count} findings=${out.findings.length} elapsedMs=${elapsed}`);
  assert.equal(out.status,'complete');assert.equal(out.filesInspected,count);assert.ok(out.findings.length>=count);
  const j=renderScanJson(out,'0.0.0');assert.ok(j.length<4*1024*1024);assert.ok(!j.includes(root));
  assert.equal(renderScanJson(out,'0.0.0'),j);
  assert.ok(elapsed<30_000,`256-file scan exceeded conservative 30s budget: ${elapsed}ms`);
}));

test('real symbolic-link cycle is never traversed and is declared incomplete',()=>withTemp(async root=>{
  await mkdir(join(root,'src'));await writeFile(join(root,'src','ok.ts'),'export const answer = 42;');
  try{await symlink(root,join(root,'src','loop'),'dir')}catch(e){if(['EPERM','EACCES','ENOTSUP'].includes(e.code))return;throw e;}
  const result=await assessHorizonRepository(root);
  assert.equal(result.status,'incomplete');assert.equal(result.filesInspected,1);
  assert.ok(result.diagnostics.some(d=>d.code==='SYMLINK_SKIPPED'));
  assert.ok(result.summary.diagnostics<10);
}));

test('total-byte cap is enforced before unsafe overrun, at exact threshold',()=>withTemp(async root=>{
  await writeFile(join(root,'a.ts'),'0123456789');await writeFile(join(root,'b.ts'),'0123456789');
  const exact=await discoverSourceFiles(root,{limits:{maxTotalBytes:20}});
  assert.equal(exact.status,'complete');assert.equal(exact.stats.totalBytes,20);
  const below=await discoverSourceFiles(root,{limits:{maxTotalBytes:19}});
  assert.equal(below.status,'incomplete');assert.equal(below.stats.totalBytes,10);
  assert.ok(below.diagnostics.some(x=>x.code==='TOTAL_BYTES_LIMIT'));
}));

test('many synthetic input variants never execute source and are deterministic', {timeout:35000},()=>{
  for(let seed=1;seed<=320;seed++){
    const source=`const irrelevant${seed} = 'https://horizon.stellar.org/accounts';\n// fetch('https://horizon.stellar.org/payments')\nconst neverExecute = () => { throw new Error('SENSITIVE_MARKER_${seed}') };\n`;
    const a=assessHorizonUsage(`src/generated${seed}.ts`,source);
    assert.equal(a.status,'complete');assert.equal(a.findings.length,0);
    const b=assessHorizonUsage(`src/generated${seed}.ts`,source);
    assert.deepEqual(a,b);assert.ok(!JSON.stringify(a).includes('SENSITIVE_MARKER'));
  }
});


test('1MiB default source size is accepted, next byte is marked incomplete', {timeout:30000},()=>withTemp(async root=>{
  const file=join(root,'boundary.ts');
  await writeFile(file,Buffer.alloc(DEFAULT_LIMITS.maxFileBytes,0x20));
  const allowed=await readSourceFile(root,'boundary.ts');assert.equal(allowed.status,'ok');
  assert.equal(allowed.sizeBytes,DEFAULT_LIMITS.maxFileBytes);
  await writeFile(file,Buffer.alloc(DEFAULT_LIMITS.maxFileBytes+1,0x20));
  const refused=await readSourceFile(root,'boundary.ts');
  assert.equal(refused.status,'incomplete');assert.equal(refused.diagnostic.code,'FILE_TOO_LARGE');
}));

test('directory depth 32 boundary prevents deeper recursion',()=>withTemp(async root=>{
  let dir=root;for(let i=0;i<33;i++){dir=join(dir,`d${String(i).padStart(2,'0')}`);await mkdir(dir);}
  await writeFile(join(dir,'nested.js'),'const secret = 1;');
  const out=await discoverSourceFiles(root);
  assert.equal(out.status,'incomplete');assert.ok(out.diagnostics.some(d=>d.code==='DEPTH_LIMIT'));
  assert.equal(out.files.length,0);
}));
