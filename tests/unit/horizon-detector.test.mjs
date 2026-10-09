import test from 'node:test';
import assert from 'node:assert/strict';
import { detectHorizonUsage } from '../../src/analysis/horizon.ts';
const scan=(code,file='src/app.ts')=>detectHorizonUsage(file,code);
const kinds=r=>r.findings.map(x=>x.kind);
const patterns=r=>r.findings.map(x=>x.pattern);
const namespace="import * as S from '@stellar/stellar-sdk';\nconst api = new S.Horizon.Server('https://horizon-testnet.stellar.org');\n";

test('recognized named import SDK constructor with correct lines',()=>{
  const r=scan("// heading\nimport { Horizon as H } from '@stellar/stellar-sdk';\nconst api = new H.Server('https://horizon.stellar.org');\napi.payments().call();");
  assert.deepEqual(kinds(r),['sdk-client','sdk-call']);
  assert.deepEqual(r.findings.map(x=>x.location.start.line),[3,4]);
  assert.equal(r.status,'complete');
});
test('namespace import and chained builder methods',()=>{
  const r=scan(namespace+"api.accounts().forAccount('GABC').limit(5).call();\napi.payments().cursor('now').stream({onmessage:()=>{}});");
  assert.deepEqual(kinds(r),['sdk-client','sdk-call','sdk-call','stream']);
  assert.equal(patterns(r).at(-1),'sdk.Horizon.stream');
});
test('CommonJS namespace SDK import',()=>{
  const r=scan("const Stellar=require('stellar-sdk');\nconst client=new Stellar.Horizon.Server('https://horizon.stellar.org');\nclient.operations().call();",'app.cjs');
  assert.deepEqual(kinds(r),['sdk-client','sdk-call']);
});
test('CommonJS destructured Horizon named import',()=>{
  const r=scan("const { Horizon: H }=require('@stellar/stellar-sdk');\nnew H.Server('https://horizon.stellar.org');");
  assert.deepEqual(kinds(r),['sdk-client']);
});
test('TypeScript import equals SDK',()=>{
  const r=scan("import SDK = require('stellar-sdk');\nnew SDK.Horizon.Server('https://horizon.stellar.org');",'app.cts');
  assert.deepEqual(kinds(r),['sdk-client']);
});
test('immutable alias chain supported',()=>{
  const r=scan(namespace+"const H=S.Horizon; const Server=H.Server; const x = new Server('https://horizon.stellar.org');\nconst alias=x; alias.effects().call();");
  assert.deepEqual(kinds(r),['sdk-client','sdk-client','sdk-call']);
});
test('no false positive from SDK import alone',()=>{
  const r=scan("import { Horizon, rpc } from '@stellar/stellar-sdk';\nconsole.log(Horizon,rpc);");
  assert.deepEqual(r.findings,[]);
});
test('RPC namespace does not count as Horizon',()=>{
  const r=scan("import { rpc } from '@stellar/stellar-sdk';\nconst rpcServer=new rpc.Server('https://soroban-testnet.stellar.org');\nrpcServer.getTransactions({});");
  assert.deepEqual(r.findings,[]);
});
test('other package pretending to be SDK is ignored',()=>{
  const r=scan("import { Horizon } from 'my-sdk';\nconst c=new Horizon.Server('https://horizon.stellar.org');\nc.payments();");
  assert.deepEqual(r.findings,[]);
});
test('scope shadowing of imported Horizon blocks SDK evidence',()=>{
  const r=scan("import { Horizon as H } from '@stellar/stellar-sdk';\nfunction f(H) { new H.Server('https://horizon.stellar.org') }\nnew H.Server('https://horizon.stellar.org');");
  assert.deepEqual(kinds(r),['sdk-client']);
  assert.equal(r.findings[0].location.start.line,3);
});
test('block-scoped shadowed alias blocks SDK evidence before declaration',()=>{
  const r=scan("import { Horizon as H } from '@stellar/stellar-sdk';\n{ new H.Server('https://horizon.stellar.org'); const H={Server:class {}}; }\nnew H.Server('https://horizon.stellar.org');");
  assert.deepEqual(kinds(r),['sdk-client']);
});
test('dynamic Horizon server URL flags unknown without emitting source',()=>{
  const r=scan("import { Horizon } from '@stellar/stellar-sdk';\nnew Horizon.Server(process.env.SUPER_SECRET);");
  assert.deepEqual(kinds(r),['sdk-client']);assert.equal(r.status,'incomplete');
  assert.deepEqual(r.unknowns.map(x=>x.code),['DYNAMIC_HORIZON_URL']);
  assert.ok(!JSON.stringify(r).includes('SUPER_SECRET'));
});
test('computed Horizon method flags unknown instead of fabricating call',()=>{
  const r=scan(namespace+"api[methodName]().call();");
  assert.deepEqual(kinds(r),['sdk-client']);assert.equal(r.status,'incomplete');
  assert.equal(r.unknowns[0].code,'DYNAMIC_HORIZON_CALL');
});
test('non-constant SDK instance not asserted as a confirmed call',()=>{
  const r=scan(namespace+"let a=api; a={payments(){}}; a.payments();");
  assert.deepEqual(kinds(r),['sdk-client']);
});
test('misleading comments and string literals are not findings',()=>{
  const r=scan("// new Horizon.Server('secret')\nconst x=\"fetch('https://horizon.stellar.org/payments')\";\n/* new H.Server('https://horizon.stellar.org') */");
  assert.deepEqual(r.findings,[]);
});
test('invalid syntax => incomplete and no partial findings',()=>{
  const r=scan(namespace+"const unfinished=(");
  assert.equal(r.status,'incomplete');assert.deepEqual(r.findings,[]);
  assert.equal(r.diagnostics[0].code,'INVALID_SYNTAX');
});
test('type-only import not actionable at runtime',()=>{
  const r=scan("import type { Horizon } from '@stellar/stellar-sdk';\nnew Horizon.Server('https://horizon.stellar.org');");
  assert.deepEqual(r.findings,[]);
});
test('deterministic sanitized output independent of credentials',()=>{
  const code="fetch('https://horizon.stellar.org/accounts/GABC?token=SECRET_1234')";
  const a=scan(code),b=scan(code);assert.equal(JSON.stringify(a),JSON.stringify(b));
  assert.deepEqual(patterns(a),['http.GET./accounts/:id']);
  assert.ok(!JSON.stringify(a).includes('SECRET_1234'));
  assert.ok(!JSON.stringify(a).includes('GABC'));
});

test('direct SDK methods recognized with sourced public API names',()=>{
  const r=scan(namespace+"api.loadAccount('GA'); api.submitTransaction(tx); api.feeStats();");
  assert.deepEqual(patterns(r),['sdk.Horizon.Server','sdk.Horizon.Server.loadAccount','sdk.Horizon.Server.submitTransaction','sdk.Horizon.Server.feeStats']);
});
test('destructured immutable SDK namespace preserves explicit Horizon binding',()=>{
  const r=scan("import * as S from '@stellar/stellar-sdk'; const {Horizon:H}=S; const api=new H.Server('https://horizon.stellar.org'); api.accounts().call();");
  assert.deepEqual(kinds(r),['sdk-client','sdk-call']);
});
