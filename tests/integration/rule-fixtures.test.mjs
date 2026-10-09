import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../../src/rules/catalog.ts';
import { detectHorizonUsage } from '../../src/analysis/horizon.ts';
import { classifyHorizonFindings } from '../../src/rules/catalog.ts';
const sdk="import { Horizon } from '@stellar/stellar-sdk'; const s=new Horizon.Server('https://horizon.stellar.org');\n";
const get=p=>`fetch('https://horizon.stellar.org${p}');`;
const inputs={
  'horizon.http.ledger-list':get('/ledgers'),
  'horizon.http.ledger-detail':get('/ledgers/123'),
  'horizon.http.transaction-submit':"fetch('https://horizon.stellar.org/transactions',{method:'POST'});",
  'horizon.http.transaction-by-hash':get('/transactions/abcd'),
  'horizon.http.account-detail':get('/accounts/GA42'),
  'horizon.http.account-list':get('/accounts'),
  'horizon.http.operation-list':get('/operations'),
  'horizon.http.operation-by-id':get('/operations/14'),
  'horizon.http.payments-list':get('/payments'),
  'horizon.http.effects-list':get('/effects'),
  'horizon.http.transactions-list':get('/transactions'),
  'horizon.http.fee-stats':get('/fee_stats'),
  'horizon.http.claimable-balances':get('/claimable_balances'),
  'horizon.http.offers':get('/offers'),
  'horizon.sdk.account-query':sdk+'s.accounts().call();',
  'horizon.sdk.payments':sdk+'s.payments().call();',
  'horizon.sdk.operations':sdk+'s.operations().call();',
  'horizon.sdk.effects':sdk+'s.effects().call();',
  'horizon.sdk.transactions':sdk+'s.transactions().call();',
  'horizon.sdk.load-account':sdk+"s.loadAccount('GABC');",
  'horizon.sdk.submit-transaction':sdk+'s.submitTransaction(tx);',
  'horizon.sdk.fee-stats':sdk+'s.feeStats();',
  'horizon.sdk.streaming':sdk+'s.payments().stream({onmessage(){}});',
  'horizon.http.hal-records':"const r=await fetch('https://horizon.stellar.org/payments');const json=await r.json();console.log(json._embedded.records);",
  'horizon.sdk.records':sdk+'const r=await s.payments().call();console.log(r.records);',
};
test('each activated rule has an actual detector fixture, not just synthetic evidence',()=>{
  assert.deepEqual(Object.keys(inputs).sort(),RULES.map(r=>r.id).sort());
});
for(const [id,source] of Object.entries(inputs)){
  test(`integration fixture produces real detector evidence for ${id}`,()=>{
    const detection=detectHorizonUsage('src/fixtures.ts',source);
    assert.equal(detection.status,'complete');
    const mapped=classifyHorizonFindings(detection.findings);
    const selected=mapped.find(f=>f.ruleId===id);
    assert.ok(selected,`Detector failed to produce ${id}; found ${mapped.map(f=>f.ruleId).join(', ')}`);
    assert.ok(selected.officialSources.length);
    assert.ok(selected.location.start.line>0&&selected.location.start.column>0);
  });
}
