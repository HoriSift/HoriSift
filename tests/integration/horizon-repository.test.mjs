import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {detectHorizonRepository} from '../../src/analysis/horizon.ts';
async function temp(fn){const d=await mkdtemp(join(tmpdir(),'horisift-detection-'));try{return await fn(d)}finally{await rm(d,{recursive:true,force:true})}}

test('repository discovery -> safe read -> proven Horizon usage',()=>temp(async root=>{
  await mkdir(join(root,'src'));await mkdir(join(root,'node_modules'));
  await writeFile(join(root,'src','a.ts'),"import {Horizon as H} from '@stellar/stellar-sdk'; const client=new H.Server('https://horizon.stellar.org'); client.payments().call();");
  await writeFile(join(root,'src','b.js'),"fetch('https://horizon-testnet.stellar.org/accounts/PRIVATE_ID')");
  await writeFile(join(root,'node_modules','ignored.ts'),"fetch('https://horizon.stellar.org/payments')");
  const a=await detectHorizonRepository(root),b=await detectHorizonRepository(root);
  assert.equal(a.status,'complete');assert.equal(a.summary.filesInspected,2);
  assert.equal(a.summary.findings,3);
  assert.deepEqual(a.findings.map(f=>f.location.file),['src/a.ts','src/a.ts','src/b.js']);
  assert.equal(JSON.stringify(a),JSON.stringify(b));
  assert.ok(!JSON.stringify(a).includes('PRIVATE_ID'));
}));
test('unsupported/empty repository never claims complete detection',()=>temp(async root=>{
  await writeFile(join(root,'readme.md'),'empty');
  const r=await detectHorizonRepository(root);
  assert.equal(r.status,'incomplete');assert.equal(r.summary.filesInspected,0);
  assert.ok(r.diagnostics.some(d=>d.code==='NO_SUPPORTED_FILES'));
}));
test('malformed file returns incomplete and no recovered false evidence',()=>temp(async root=>{
  await writeFile(join(root,'broken.ts'),"fetch('https://horizon.stellar.org/payments');const bad=(");
  const r=await detectHorizonRepository(root);
  assert.equal(r.status,'incomplete');assert.equal(r.summary.findings,0);
  assert.ok(r.diagnostics.some(d=>d.code==='INVALID_SYNTAX'));
}));
test('resource budget cutoff remains incomplete with only bounded findings',()=>temp(async root=>{
  await writeFile(join(root,'a.ts'),"fetch('https://horizon.stellar.org/payments')");
  await writeFile(join(root,'b.ts'),"fetch('https://horizon.stellar.org/payments')");
  const r=await detectHorizonRepository(root,{limits:{maxFiles:1}});
  assert.equal(r.status,'incomplete');assert.ok(r.summary.filesInspected<=1);
  assert.ok(r.diagnostics.some(d=>d.code==='FILE_LIMIT'));
}));
test('symlink to outside repository is never read',()=>temp(async root=>{
  const outer=await mkdtemp(join(tmpdir(),'horisift-external-'));
  try {await writeFile(join(outer,'private.ts'),"throw new Error('SECRET');fetch('https://horizon.stellar.org/payments')");
    await symlink(join(outer,'private.ts'),join(root,'linked.ts'),'file');
    await writeFile(join(root,'safe.ts'),"console.log('safe')");
    const r=await detectHorizonRepository(root);
    assert.equal(r.status,'incomplete');assert.deepEqual(r.findings,[]);
    assert.ok(!JSON.stringify(r).includes('SECRET'));
    assert.ok(r.diagnostics.some(d=>d.code==='SYMLINK_SKIPPED'));
  } finally {await rm(outer,{recursive:true,force:true})}
}));
test('dynamic dependencies are explicitly incomplete in integrated result',()=>temp(async root=>{
  await writeFile(join(root,'x.ts'),"fetch(process.env.HORIZON_ENDPOINT);");
  const r=await detectHorizonRepository(root);
  assert.equal(r.status,'incomplete');assert.deepEqual(r.unknowns.map(x=>x.code),['DYNAMIC_HTTP_URL']);
}));
test('user supplied exclusions prune paths',()=>temp(async root=>{
  await mkdir(join(root,'dist'));await mkdir(join(root,'src'));
  await writeFile(join(root,'dist','skip.ts'),"fetch('https://horizon.stellar.org/payments')");
  await writeFile(join(root,'src','ignore.ts'),"fetch('https://horizon.stellar.org/payments')");
  await writeFile(join(root,'src','safe.js'),"console.log('no request')");
  const r=await detectHorizonRepository(root,{excludePaths:['src/ignore.ts']});
  assert.equal(r.status,'complete');assert.equal(r.summary.filesInspected,1);assert.deepEqual(r.findings,[]);
}));
