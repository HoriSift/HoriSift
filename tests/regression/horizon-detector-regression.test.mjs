import test from 'node:test';
import assert from 'node:assert/strict';
import {detectHorizonUsage} from '../../src/analysis/horizon.ts';
const f=(s,file='file.ts')=>detectHorizonUsage(file,s);

test('regression: nested non SDK Horizon does not count',()=>{
  const r=f("import {Horizon as H} from '@stellar/stellar-sdk';\n{ const H = {Server:class {}}; const s=new H.Server('anything'); s.payments(); }");
  assert.deepEqual(r.findings,[]);
});
test('regression: returned const in shadowed block is not SDK instance',()=>{
  const r=f("import {Horizon} from '@stellar/stellar-sdk';\nconst real = new Horizon.Server('https://horizon.stellar.org');\nfunction fn(real){ return real.payments().call(); }");
  assert.deepEqual(r.findings.map(x=>x.kind),['sdk-client']);
});
test('regression: comment containing valid SDK syntax not executable',()=>{
  const r=f("const example = `new H.Server('https://horizon.stellar.org')`;\n// server.payments().call()");
  assert.deepEqual(r.findings,[]);
});
test('regression: URL in unrelated variable is not a request',()=>{
  const r=f("const documentation='https://horizon.stellar.org/payments';");
  assert.deepEqual(r.findings,[]);
});
test('regression: invalid syntax prevents partial detection',()=>{
  const r=f("fetch('https://horizon.stellar.org/payments'); const x=(");
  assert.equal(r.status,'incomplete');assert.deepEqual(r.findings,[]);
});
test('regression: Unicode paths and source positions stable',()=>{
  const s="const flag='🛰️';\nfetch('https://horizon.stellar.org/payments');";
  const a=f(s,'é/⭐.tsx'),b=f(s,'é/⭐.tsx');
  assert.equal(JSON.stringify(a),JSON.stringify(b));
  assert.equal(a.findings[0].location.file,'é/⭐.tsx');
  assert.equal(a.findings[0].location.start.line,2);
});
test('regression: var hoisting shadows imported Horizon through nested blocks',()=>{
  const r=f("import {Horizon as H} from '@stellar/stellar-sdk';\nfunction fn(){ if(true){ var H={Server:class {}} } new H.Server('https://horizon.stellar.org'); }");
  assert.deepEqual(r.findings,[]);
});
test('regression: shadowed require function cannot forge trusted SDK import',()=>{
  const r=f("function f(require){const SDK=require('stellar-sdk'); new SDK.Horizon.Server('https://horizon.stellar.org');}");
  assert.deepEqual(r.findings,[]);
});
test('regression: mutable Horizon client is incomplete, not a trusted method call',()=>{
  const r=f("import {Horizon} from '@stellar/stellar-sdk';\nlet client=new Horizon.Server('https://horizon.stellar.org');client.payments().call();");
  assert.equal(r.status,'incomplete');
  assert.ok(r.unknowns.some(x=>x.code==='MUTABLE_SDK_BINDING'));
  assert.deepEqual(r.findings.map(x=>x.kind),['sdk-client']);
});
test('regression: static HTTP body and token never serialized',()=>{
  const r=f("fetch('https://horizon.stellar.org/transactions?apikey=SECRET',{method:'POST',body:'PRIVATE'})");
  assert.ok(!JSON.stringify(r).includes('SECRET'));
  assert.ok(!JSON.stringify(r).includes('PRIVATE'));
});
test('regression: deeply aliased SDK names stay bounded without stack overflow',()=>{
  const src=["import {Horizon} from '@stellar/stellar-sdk';"];
  for(let i=0;i<300;i++)src.push(`const a${i} = ${i===0?'Horizon':`a${i-1}`};`);
  src.push("new a299.Server('https://horizon.stellar.org')");
  const r=f(src.join('\n'));
  assert.deepEqual(r.findings,[]); // Explicitly outside the supported alias depth.
});
