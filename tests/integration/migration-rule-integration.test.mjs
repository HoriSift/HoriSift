import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,rm,symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectHorizonUsage, detectHorizonRepository } from '../../src/analysis/horizon.ts';
import { classifyHorizonFindings, classifyHorizonDetection } from '../../src/rules/catalog.ts';
const evaluate=(code,file='src/app.ts')=>classifyHorizonDetection(detectHorizonUsage(file,code));
const by=(result,rule)=>result.findings.find(f=>f.ruleId===rule);
test('real detector: accounts list requires indexer; account lookup must derive trustlines',()=>{
  const result=evaluate("fetch('https://horizon.stellar.org/accounts');\nfetch('https://horizon.stellar.org/accounts/GABC?auth=SHOULD_NOT_LEAK');");
  assert.equal(by(result,'horizon.http.account-list').mappingKind,'indexer-required');
  assert.equal(by(result,'horizon.http.account-detail').mappingKind,'conditional');
  assert.deepEqual(result.findings.map(f=>f.location.start.line),[1,2]);
  assert.ok(!JSON.stringify(result).includes('SHOULD_NOT_LEAK'));
  assert.ok(!JSON.stringify(result).includes('GABC'));
});
test('real detector: ledgers and submitTransaction have cited direct mappings with caveats',()=>{
  const result=evaluate("fetch('https://horizon.stellar.org/ledgers');\nfetch('https://horizon.stellar.org/transactions',{method:'POST'});");
  assert.equal(by(result,'horizon.http.ledger-list').mappingKind,'direct');
  assert.deepEqual(by(result,'horizon.http.ledger-list').rpcMethods,['getLedgers']);
  assert.equal(by(result,'horizon.http.transaction-submit').mappingKind,'direct');
  assert.deepEqual(by(result,'horizon.http.transaction-submit').rpcMethods,['sendTransaction']);
});
test('classic payments and effects never assert getEvents is a direct replacement',()=>{
  const result=evaluate("fetch('https://horizon-testnet.stellar.org/payments');\nfetch('https://horizon-testnet.stellar.org/effects')");
  for(const f of result.findings){
    assert.equal(f.mappingKind,'conditional');
    assert.ok(f.limitations.some(l=>l.includes('EMIT_CLASSIC_EVENTS')));
    assert.ok(f.limitations.some(l=>l.includes('BACKFILL_STELLAR_ASSET_EVENTS')));
    assert.ok(f.limitations.some(l=>l.includes('history')));
  }
});
test('sdk builder method remains unknown when account lookup/list is not established',()=>{
  const result=evaluate("import { Horizon } from '@stellar/stellar-sdk';\nconst c = new Horizon.Server('https://horizon.stellar.org');\nc.accounts().call();");
  assert.equal(by(result,'horizon.sdk.account-query').mappingKind,'unknown');
  assert.ok(result.findings.some(f=>f.ruleId==='horizon.unmapped-pattern'));
});
test('SDK payment, stream and response patterns preserve semantics and provenance',()=>{
  const source="import * as S from '@stellar/stellar-sdk';\nconst c=new S.Horizon.Server('https://horizon.stellar.org');\nc.payments().stream({onmessage(){}});\nconst data=await c.payments().call(); console.log(data.records);";
  const result=evaluate(source);
  assert.ok(by(result,'horizon.sdk.payments'));
  assert.ok(by(result,'horizon.sdk.streaming'));
  assert.ok(by(result,'horizon.sdk.records'));
  assert.equal(by(result,'horizon.sdk.streaming').rpcMethods.length,0);
  assert.ok(result.findings.every(x=>x.officialSources[0].url.startsWith('https://developers.stellar.org/')));
});
test('no Horizon dependency from comments, strings or other hosts',()=>{
  const result=evaluate("// fetch('https://horizon.stellar.org/payments')\nconst x='Horizon.Server';\nfetch('https://api.example.org/accounts');");
  assert.deepEqual(result.findings,[]);
});
test('dynamic Horizon URL is still incomplete after classification',()=>{
  const result=evaluate("fetch('https://horizon.stellar.org/' + path)");
  assert.equal(result.status,'incomplete');
  assert.ok(result.unknowns.length>=1);
  assert.deepEqual(result.findings,[]);
});
test('malformed JS/TS must remain incomplete with no unsupported mapping',()=>{
  const result=evaluate("fetch('https://horizon.stellar.org/accounts');const broken = (;");
  assert.equal(result.status,'incomplete');
  assert.deepEqual(result.findings,[]);
  assert.ok(result.diagnostics.length>0);
});
test('end-to-end scan over multiple repository files leaves credentials out of classified results',async()=>{
  const tmp=await mkdtemp(join(tmpdir(),'horisift-rule-'));
  try{
    await writeFile(join(tmp,'one.ts'),"fetch('https://horizon.stellar.org/accounts?api_key=DONT_LEAK')");
    await writeFile(join(tmp,'two.js'),"fetch('https://horizon.stellar.org/operations/123');");
    await writeFile(join(tmp,'three.js'),"fetch('https://api.example.com/payments')");
    const report=await detectHorizonRepository(tmp);
    assert.equal(report.status,'complete');
    const categorized=classifyHorizonFindings(report.findings);
    assert.deepEqual(categorized.map(x=>x.ruleId),['horizon.http.account-list','horizon.http.operation-by-id']);
    assert.ok(!JSON.stringify(categorized).includes('DONT_LEAK'));
    assert.ok(categorized.some(x=>x.mappingKind==='no-direct-rpc-equivalent'));
  }finally{await rm(tmp,{recursive:true,force:true});}
});
