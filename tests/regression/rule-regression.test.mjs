import test from 'node:test';
import assert from 'node:assert/strict';
import { detectHorizonUsage } from '../../src/analysis/horizon.ts';
import { classifyHorizonFindings, RULES, validateRuleCatalog } from '../../src/rules/catalog.ts';
const run=source=>classifyHorizonFindings(detectHorizonUsage('src/test.ts',source).findings);
test('regression: wrong HTTP verb cannot borrow POST transaction mapping',()=>{
  const r=run("fetch('https://horizon.stellar.org/transactions',{method:'DELETE'});");
  assert.equal(r.length,1); assert.equal(r[0].mappingKind,'unknown');
});
test('regression: accounts collection must not become account detail mapping',()=>{
  const r=run("fetch('https://horizon.stellar.org/accounts')");
  assert.equal(r[0].ruleId,'horizon.http.account-list');
});
test('regression: single account endpoint must not imply trustlines included',()=>{
  const r=run("fetch('https://horizon.stellar.org/accounts/GA42')");
  assert.equal(r[0].mappingKind,'conditional');
  assert.ok(r[0].limitations.some(x=>/trustline/i.test(x)));
});
test('regression: operation by Horizon ID has no direct mapping',()=>{
  const r=run("fetch('https://horizon.stellar.org/operations/12')");
  assert.equal(r[0].mappingKind,'no-direct-rpc-equivalent');
  assert.equal(r[0].rpcMethods.length,0);
});
test('regression: SDK imported but shadowed by another binding does not classify',()=>{
  const r=run("import {Horizon} from '@stellar/stellar-sdk'; function p(Horizon) {const s=new Horizon.Server('https://horizon.stellar.org'); s.payments();}");
  assert.equal(r.length,0);
});
test('regression: custom domain is not assumed to be an official Horizon provider',()=>{
  const r=run("fetch('https://horizon.custom-example.com/operations')");
  assert.deepEqual(r,[]);
});
test('regression: arbitrary method name is not accepted as verified RPC equivalence',()=>{
  const r=run("import * as S from '@stellar/stellar-sdk'; const c=new S.Horizon.Server('https://horizon.stellar.org'); c.customMethod();");
  assert.equal(r.length,1);
  assert.equal(r[0].mappingKind,'unknown');
});
test('regression: unknown endpoint remains unknown rather than closest path matching',()=>{
  const r=run("fetch('https://horizon.stellar.org/accounts/GABC/payments');");
  assert.equal(r.length,1);assert.equal(r[0].mappingKind,'unknown');
});
test('regression: path/query secret does not enter classified output',()=>{
  const result=run("fetch('https://horizon.stellar.org/payments/GSECRET?token=1234');");
  assert.ok(!JSON.stringify(result).includes('1234'));
  assert.ok(!JSON.stringify(result).includes('GSECRET'));
});
test('regression: catalog rejects silent unsigned official source substitution',()=>{
  const rules=structuredClone(RULES);rules[0].officialSources=[{url:'http://developers.stellar.org/docs/data/apis/rpc',checkedDate:'2026-10-09',note:'Incorrect scheme without trusted verification source'}];
  assert.ok(validateRuleCatalog(rules).some(x=>x.startsWith('INVALID_SOURCES')));
});
