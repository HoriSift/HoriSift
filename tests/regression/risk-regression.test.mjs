import test from 'node:test';
import assert from 'node:assert/strict';
import {assessClassifiedDetection,assessHorizonUsage} from '../../src/analysis/risk.ts';
import {classifyHorizonFindings} from '../../src/rules/catalog.ts';
const L={file:'src/index.ts',start:{line:1,column:1},end:{line:1,column:15}};
const assess=(finding)=>assessClassifiedDetection({status:'complete',findings:classifyHorizonFindings([finding]),unknowns:[],diagnostics:[]});

test('regression: no direct equivalence for Horizon operation ID',()=>{
  const f=assess({kind:'http-call',pattern:'http.GET./operations/:id',location:L}).findings[0];
  assert.equal(f.mappingKind,'no-direct-rpc-equivalent');assert.equal(f.severity,'high');assert.equal(f.confidence,'high');
  assert.deepEqual(f.rpcMethods,[]);
});
test('regression: account listing is not direct RPC account lookup',()=>{
  const r=assess({kind:'http-call',pattern:'http.GET./accounts',location:L});
  assert.equal(r.findings[0].mappingKind,'indexer-required');
  assert.ok(!r.findings[0].rpcMethods.includes('getLedgerEntries'));
});
test('regression: unknown SDK method never inherits nearby catalog method',()=>{
  const r=assess({kind:'sdk-call',pattern:'sdk.Horizon.Server.paymentsAccount',location:L});
  assert.equal(r.findings[0].mappingKind,'unknown');assert.deepEqual(r.findings[0].rpcMethods,[]);
});
test('regression: shadowed SDK import cannot generate false high risk',()=>{
  const code="import { Horizon } from '@stellar/stellar-sdk';\nfunction test(Horizon){ const client=new Horizon.Server('https://horizon.stellar.org');client.accounts(); }";
  const r=assessHorizonUsage('src/shadow.ts',code);
  assert.equal(r.summary.findings,0);assert.equal(r.triage,'no-supported-evidence');
});
test('regression: comments containing high-risk endpoint never create high finding',()=>{
  const r=assessHorizonUsage('src/comments.js',"// fetch('https://horizon.stellar.org/operations/9')\nconst x='accounts';");
  assert.equal(r.summary.findings,0);
});
test('regression: malformed input cannot masquerade as complete migration review',()=>{
  const r=assessHorizonUsage('src/broken.ts',"fetch('https://horizon.stellar.org/payments'); const broken = (;");
  assert.equal(r.status,'incomplete');assert.equal(r.triage,'incomplete');
  assert.equal(r.summary.highestSeverity,null);
});
test('regression: ordering stable with same severity different confidence',()=>{
  const L2={...L,start:{line:2,column:1},end:{line:2,column:15}};
  const findings=classifyHorizonFindings([
    {kind:'http-call',pattern:'http.GET./operations',location:L},
    {kind:'sdk-call',pattern:'sdk.Horizon.Server.payments',location:L2}
  ]);
  const r=assessClassifiedDetection({status:'complete',findings,unknowns:[],diagnostics:[]});
  assert.equal(r.findings[0].confidence,'medium');assert.equal(r.findings[1].confidence,'high');
});
test('regression: evidence ID never contains raw token',()=>{
  const r=assessHorizonUsage('src/wallet.js',"fetch('https://horizon.stellar.org/accounts?auth=KEEP_SECRET')");
  assert.match(r.findings[0].id,/^[0-9a-f]{32}$/);assert.ok(!JSON.stringify(r).includes('KEEP_SECRET'));
});
