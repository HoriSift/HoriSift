import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, RULE_SET_VERSION, validateRuleCatalog, classifyHorizonFindings, classifyHorizonDetection } from '../../src/rules/catalog.ts';
const L={file:'src/payments.ts',start:{line:3,column:2},end:{line:3,column:19}};
const synthetic = r=>({kind:r.detectionKind,pattern:r.matchTarget,location:L});
const copy=()=>structuredClone(RULES);
test('catalog is valid, immutable, semver and has exact nonduplicated matches',()=>{
  assert.equal(validateRuleCatalog(RULES).length,0);
  assert.equal(RULE_SET_VERSION,'1.0.0');
  assert.ok(RULES.length>=20);
  assert.equal(new Set(RULES.map(r=>r.id)).size,RULES.length);
  assert.equal(new Set(RULES.map(r=>`${r.detectionKind}:${r.matchTarget}`)).size,RULES.length);
  assert.ok(Object.isFrozen(RULES));
  assert.ok(RULES.every(r=>Object.isFrozen(r)&&Object.isFrozen(r.officialSources)&&Object.isFrozen(r.limitations)));
});
for(const r of RULES){
  test(`source-backed rule ${r.id}: exact positive, mapping, location and references`,()=>{
    const output=classifyHorizonFindings([synthetic(r)]);
    assert.equal(output.length,1);
    assert.equal(output[0].ruleId,r.id);
    assert.equal(output[0].mappingKind,r.mappingKind);
    assert.deepEqual(output[0].location,L);
    assert.deepEqual(output[0].rpcMethods,r.rpcMethods);
    assert.ok(output[0].recommendation.length>20);
    assert.ok(output[0].officialSources.length>0);
    assert.ok(output[0].officialSources.every(s=>s.url.startsWith('https://developers.stellar.org/')&&s.checkedDate==='2026-10-09'));
    assert.ok(output[0].limitations.length>0);
    assert.equal(output[0].ruleVersion,'1.0.0');
  });
}
const failure=(mutate,prefix)=>{
  const definitions=copy();mutate(definitions);
  assert.ok(validateRuleCatalog(definitions).some(e=>e.startsWith(prefix)),JSON.stringify(validateRuleCatalog(definitions)));
};
test('rejects empty/null/nonarray and oversized catalogs',()=>{
  for(const x of [[],null,{},'',Array.from({length:301},()=>({}))])assert.deepEqual(validateRuleCatalog(x),['INVALID_CATALOG']);
});
test('rejects duplicate ID and duplicate detector match',()=>{
  failure(x=>x[1].id=x[0].id,'DUPLICATE_ID');
  failure(x=>x[1].matchTarget=x[0].matchTarget,'DUPLICATE_PATTERN');
});
test('rejects invalid rule fields and semver',()=>{
  failure(x=>x[0].id='ATTACKER','INVALID_ID');
  failure(x=>x[0].version='latest','INVALID_VERSION');
  failure(x=>x[0].name=null,'INVALID_FIELDS');
});
test('rejects unknown mapping or unsafe optimistic equivalents',()=>{
  failure(x=>x[0].mappingKind='magic','INVALID_MAPPING');
  failure(x=>{x[0].mappingKind='no-direct-rpc-equivalent'},'MISLEADING_MAPPING');
  failure(x=>{x[0].rpcMethods=[]},'MISSING_DIRECT_METHOD');
  failure(x=>{x[0].rpcMethods=['sendEverything']},'INVALID_RPC_METHODS');
});
test('rejects wildcard, out of kind, method-mismatch and raw arbitrary patterns',()=>{
  failure(x=>x[0].matchTarget='http.GET./*','INVALID_PATTERN');
  failure(x=>x[0].matchTarget='http.GET./accounts/GSECRET?token=123','INVALID_PATTERN');
  failure(x=>x[0].detectionKind='other','INVALID_DETECTION_KIND');
  failure(x=>x[0].detectionKind='sdk-call','INVALID_PATTERN');
});
test('rejects bogus, stale-format or nonofficial source citations',()=>{
  failure(x=>x[0].officialSources=[],'INVALID_SOURCES');
  failure(x=>x[0].officialSources[0].url='https://attacker.example/fake','INVALID_SOURCES');
  failure(x=>x[0].officialSources[0].checkedDate='tomorrow','INVALID_SOURCES');
  failure(x=>x[0].officialSources[0].note='x','INVALID_SOURCES');
});
test('rejects missing limitations and harmful source excerpts',()=>{
  failure(x=>x[0].limitations=[],'INVALID_LIMITATIONS');
  failure(x=>x[0].recommendation='secret=API_KEY','INVALID_DESCRIPTION');
  failure(x=>x[0].limitations=['token=leak'],'INVALID_LIMITATIONS');
});
test('not-exact SDK/HTTP patterns never receive a stronger matching classification',()=>{
  const other=[
    {kind:'sdk-call',pattern:'sdk.Horizon.Server.weirdFutureMethod',location:L},
    {kind:'http-call',pattern:'http.POST./accounts',location:L},
    {kind:'http-call',pattern:'http.UNKNOWN./transactions',location:L},
    {kind:'http-call',pattern:'http.GET./accounts/:id/payments',location:L},
    {kind:'sdk-client',pattern:'sdk.Horizon.Server',location:L},
  ];
  const out=classifyHorizonFindings(other);
  assert.equal(out.length,other.length);
  assert.ok(out.every(x=>x.mappingKind==='unknown'&&x.ruleId==='horizon.unmapped-pattern'));
});
test('invalid locations, paths, user source, secrets and unsupported kinds are rejected',()=>{
  for(const f of [
    {kind:'http-call',pattern:'http.GET./accounts/GABC?secret=123',location:L},
    {kind:'http-call',pattern:'http.GET./accounts',location:{...L,file:'../outside.ts'}},
    {kind:'http-call',pattern:'http.GET./accounts',location:{...L,file:'C:\\secret.ts'}},
    {kind:'http-call',pattern:'http.GET./accounts',location:{...L,start:{line:0,column:1}}},
    {kind:'http-call',pattern:'http.GET./accounts',location:{...L,start:{line:8,column:2},end:{line:1,column:2}}},
    {kind:'fake',pattern:'http.GET./accounts',location:L},
  ])assert.throws(()=>classifyHorizonFindings([f]),TypeError);
});
test('deterministic canonical order independent of incoming array order',()=>{
  const rows=[
    {kind:'http-call',pattern:'http.GET./accounts',location:{...L,file:'z.ts'}},
    {kind:'http-call',pattern:'http.GET./payments',location:{...L,file:'a.ts',start:{line:5,column:1},end:{line:5,column:19}}},
    {kind:'http-call',pattern:'http.GET./ledgers',location:{...L,file:'a.ts',start:{line:1,column:3}}},
  ];
  assert.equal(JSON.stringify(classifyHorizonFindings(rows)),JSON.stringify(classifyHorizonFindings(rows.reverse())));
});
test('preserves incomplete status and unknown diagnostics unchanged',()=>{
  const finding={kind:'http-call',pattern:'http.GET./accounts',location:L};
  const report={file:'src/payments.ts',status:'incomplete',findings:[finding],unknowns:[{code:'DYNAMIC_HTTP_URL',location:L,message:'Dynamic URL'}],diagnostics:[]};
  const result=classifyHorizonDetection(report);
  assert.equal(result.status,'incomplete');assert.equal(result.unknowns.length,1);assert.equal(result.findings[0].mappingKind,'indexer-required');
});
test('all five mapping kinds represented and no unqualified ready verdict',()=>{
  assert.deepEqual([...new Set(RULES.map(r=>r.mappingKind))].sort(),['conditional','direct','indexer-required','no-direct-rpc-equivalent','unknown']);
  assert.ok(!JSON.stringify(classifyHorizonFindings(RULES.map(synthetic))).includes('migrationReady'));
});
