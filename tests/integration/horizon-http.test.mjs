import test from 'node:test';
import assert from 'node:assert/strict';
import { detectHorizonUsage } from '../../src/analysis/horizon.ts';
const scan=(x)=>detectHorizonUsage('http.ts',x);
const p=x=>x.findings.map(f=>f.pattern);

test('global fetch to official Horizon mainnet/testnet hosts',()=>{
  for(const domain of ['horizon.stellar.org','horizon-testnet.stellar.org','horizon-futurenet.stellar.org']){
    const r=scan(`fetch('https://${domain}/payments')`);assert.deepEqual(p(r),['http.GET./payments']);
  }
});
test('globalThis.fetch classified with known URL',()=>{
  assert.deepEqual(p(scan("globalThis.fetch('https://horizon.stellar.org/transactions')")),['http.GET./transactions']);
});
test('constant-concatenated URL recognized without reporting literal value',()=>{
  const r=scan("const origin='https://horizon-testnet.stellar.org'; const endpoint=origin+'/effects'; fetch(endpoint)");
  assert.deepEqual(p(r),['http.GET./effects']);
});
test('fetch on unrelated host does not create findings or false HAL evidence',()=>{
  const r=scan("const resp=await fetch('https://unrelated.example/payments'); const data=await resp.json(); data._embedded.records;");
  assert.deepEqual(p(r),[]);assert.equal(r.status,'complete');
});
test('lookalike domains and credentials rejected',()=>{
  for(const u of ['https://horizon.stellar.org.evil.net/payments','https://evil.net/horizon.stellar.org/payments','https://horizon.stellar.org@evil.net/payments','https://username:pw@horizon.stellar.org/payments']){
    assert.deepEqual(p(scan(`fetch('${u}')`)),[]);
  }
});
test('query, fragments and path values not leaked',()=>{
  const r=scan("fetch('https://horizon.stellar.org/accounts/GPRIVATE/payments?token=SUPER_SECRET#x')");
  assert.deepEqual(p(r),['http.GET./accounts/:id/payments']);
  assert.ok(!JSON.stringify(r).includes('GPRIVATE'));
  assert.ok(!JSON.stringify(r).includes('SUPER_SECRET'));
});
test('axios ESM GET plus response.data._embedded.records evidence',()=>{
  const r=scan("import axios from 'axios'; const res=await axios.get('https://horizon.stellar.org/payments'); res.data._embedded.records;");
  assert.deepEqual(p(r),['http.GET./payments','http.HAL._embedded.records']);
});
test('axios POST classified without invented migration advice',()=>{
  const r=scan("const axios=require('axios'); axios.post('https://horizon-testnet.stellar.org/transactions', 'signedTx');");
  assert.deepEqual(p(r),['http.POST./transactions']);
});
test('random axios-like object should not be trusted',()=>{
  const r=scan("const axios = { get:()=>{} }; axios.get('https://horizon.stellar.org/payments');");
  assert.deepEqual(p(r),[]);
});
test('fetch shadowing function parameter blocks detection',()=>{
  const r=scan("function run(fetch) { return fetch('https://horizon.stellar.org/payments'); }");
  assert.deepEqual(p(r),[]);
});
test('dynamic Horizon-labelled URL is incomplete not invented',()=>{
  const r=scan("fetch(process.env.HORIZON_ENDPOINT);");
  assert.deepEqual(p(r),[]);assert.equal(r.status,'incomplete');
  assert.equal(r.unknowns[0].code,'DYNAMIC_HTTP_URL');
});
test('unrelated dynamic URL is not asserted as Horizon',()=>{
  const r=scan('fetch(process.env.API_ENDPOINT)');assert.deepEqual(p(r),[]);
});
test('response payload follows proven Horizon fetch, not unrelated one',()=>{
  const r=scan("const res=await fetch('https://horizon.stellar.org/payments');const data=await res.json(); data._embedded.records;");
  assert.deepEqual(p(r),['http.GET./payments','http.HAL._embedded.records']);
});
test('response HAL path alone without proven HTTP provenance is ignored',()=>{
  const r=scan('const records=untrusted._embedded.records;');assert.deepEqual(p(r),[]);
});
test('SDk page.records only if proven chained call',()=>{
  const r=scan("import { Horizon } from '@stellar/stellar-sdk'; const h=new Horizon.Server('https://horizon.stellar.org'); const p=await h.payments().call(); p.records;");
  assert.deepEqual(p(r),['sdk.Horizon.Server','sdk.Horizon.Server.payments','sdk.Horizon.records']);
});
test('fetch method POST is not mislabeled GET',()=>{
  const r=scan("fetch('https://horizon.stellar.org/transactions',{method:'POST',body:'signed'})");
  assert.deepEqual(p(r),['http.POST./transactions']);
});
test('unknown fetch method is incomplete, never fabricated GET',()=>{
  const r=scan("fetch('https://horizon.stellar.org/transactions',{method:verb})");
  assert.equal(r.status,'incomplete');assert.deepEqual(p(r),['http.UNKNOWN./transactions']);
  assert.deepEqual(r.unknowns.map(x=>x.code),['DYNAMIC_HTTP_METHOD']);
});
test('Horizon-labeled interpolated URL is an unknown, not ignored',()=>{
  const r=scan('const addr=`https://horizon.stellar.org/accounts/${account}`; fetch(addr)');
  assert.deepEqual(p(r),[]);assert.equal(r.status,'incomplete');
  assert.deepEqual(r.unknowns.map(x=>x.code),['DYNAMIC_HTTP_URL']);
});
