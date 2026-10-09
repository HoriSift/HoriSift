import test from 'node:test';
import assert from 'node:assert/strict';
import {RULES, classifyHorizonFindings, RULE_SET_VERSION, classifyHorizonDetection} from '../../src/rules/catalog.ts';
import {assessClassifiedDetection,assessHorizonUsage,RISK_SCHEMA_VERSION} from '../../src/analysis/risk.ts';

const L={file:'src/a.ts',start:{line:3,column:2},end:{line:3,column:18}};
const evidence=(r,location=L)=>({kind:r.detectionKind,pattern:r.matchTarget,location});
const assessment=(input,status='complete',unknowns=[],diagnostics=[])=>assessClassifiedDetection({status,findings:classifyHorizonFindings(input),unknowns,diagnostics});
const rule=(id)=>RULES.find(r=>r.id===id);
const unknown={code:'DYNAMIC_HTTP_URL',location:L,message:'API_TOKEN=do-not-copy'};
const diagnostic={code:'FILE_UNREADABLE',file:'src/a.ts',message:'SECRET /home/name/keys'};

test('risk version is stable and no readiness/certification field exists',()=>{
  const r=assessment([evidence(rule('horizon.http.ledger-list'))]);
  assert.equal(r.schemaVersion,RISK_SCHEMA_VERSION);assert.equal(r.ruleSetVersion,RULE_SET_VERSION);
  assert.deepEqual(Object.keys(r),['schemaVersion','ruleSetVersion','status','triage','summary','findings','unknowns','diagnostics']);
  assert.ok(!JSON.stringify(r).includes('migrationReady'));
  assert.equal(r.triage,'review-required');
});
test('all 25 catalog rules retain source evidence and independent severity/confidence',()=>{
  for(const r of RULES){
    const a=assessment([evidence(r)]);
    assert.equal(a.findings.length,1,r.id);
    const f=a.findings[0];assert.equal(f.ruleId,r.id);assert.equal(f.mappingKind,r.mappingKind);
    assert.equal(f.confidence,r.mappingKind==='unknown'?'unknown':r.confidence);
    assert.ok(['info','low','medium','high'].includes(f.severity));
    assert.equal(f.officialSources[0].url,r.officialSources[0].url);
    assert.ok(f.reasonCodes.includes('APPLICATION_REVIEW_REQUIRED'));
    assert.ok(f.recommendedAction.length>20);
    assert.ok(!('migrationReady' in f));
  }
});
test('indexer required and no direct equivalent always rank high even if defaults were lower',()=>{
  for(const id of ['horizon.http.account-list','horizon.http.operation-by-id','horizon.http.claimable-balances','horizon.http.offers']){
    const f=assessment([evidence(rule(id))]).findings[0];assert.equal(f.severity,'high');
    assert.ok(f.reasonCodes.includes(id==='horizon.http.operation-by-id'?'NO_DIRECT_RPC_EQUIVALENT':'INDEXER_REQUIRED'));
  }
});
test('direct mapping is not approved equivalence and requires review',()=>{
  const f=assessment([evidence(rule('horizon.http.transaction-submit'))]).findings[0];
  assert.equal(f.mappingKind,'direct');assert.ok(f.reasonCodes.includes('DIRECT_API_MAPPING_NOT_PARITY'));
  assert.ok(f.reasonCodes.includes('TRANSACTION_STATUS_LIFECYCLE'));
});
test('classic events are not universal payment/effect substitutes',()=>{
  for(const id of ['horizon.http.payments-list','horizon.sdk.payments','horizon.http.effects-list','horizon.sdk.effects']){
    const f=assessment([evidence(rule(id))]).findings[0];
    assert.ok(f.reasonCodes.includes('CLASSIC_EVENTS_REQUIRE_PROVIDER_CHECK'),id);
    assert.ok(f.reasonCodes.includes('RPC_HISTORY_LIMIT'),id);
    assert.ok(f.limitations.some(x=>x.includes('EMIT_CLASSIC_EVENTS=true')));
  }
});
test('stream, HAL records and account response get explicit review reasons',()=>{
  for(const [id,expected] of [
    ['horizon.sdk.streaming','STREAMING_REDESIGN'],
    ['horizon.http.hal-records','HAL_RESPONSE_REWRITE'],
    ['horizon.sdk.records','HAL_RESPONSE_REWRITE'],
    ['horizon.sdk.load-account','ACCOUNT_RESPONSE_DIFFERENCE'],
    ['horizon.http.account-detail','ACCOUNT_RESPONSE_DIFFERENCE']
  ])assert.ok(assessment([evidence(rule(id))]).findings[0].reasonCodes.includes(expected),id);
});
test('unknown exact fallback is medium/unknown and not falsely mapped to a method',()=>{
  const f=assessment([{kind:'sdk-call',pattern:'sdk.Horizon.Server.nonexistent',location:L}]).findings[0];
  assert.equal(f.ruleId,'horizon.unmapped-pattern');assert.equal(f.mappingKind,'unknown');assert.equal(f.severity,'medium');assert.equal(f.confidence,'unknown');
  assert.deepEqual(f.rpcMethods,[]);assert.ok(f.reasonCodes.includes('UNMAPPED_HORIZON_PATTERN'));
});
test('severity and confidence are separate for ambiguous SDK account builder',()=>{
  const f=assessment([evidence(rule('horizon.sdk.account-query'))]).findings[0];
  assert.equal(f.severity,'medium');assert.equal(f.confidence,'unknown');
});
test('high severity does not imply high confidence',()=>{
  const f=assessment([evidence(rule('horizon.sdk.payments'))]).findings[0];
  assert.equal(f.severity,'high');assert.equal(f.confidence,'medium');
});
test('incomplete coverage takes precedence over findings',()=>{
  const a=assessment([evidence(rule('horizon.http.transaction-submit'))],'incomplete');
  assert.equal(a.status,'incomplete');assert.equal(a.triage,'incomplete');assert.equal(a.summary.manualReviewRequired,2);
});
test('complete status with unknown is still incomplete, redacts message',()=>{
  const a=assessment([], 'complete',[unknown]);
  assert.equal(a.status,'incomplete');assert.equal(a.triage,'incomplete');
  assert.equal(a.unknowns[0].code,'DYNAMIC_HTTP_URL');assert.ok(!JSON.stringify(a).includes('API_TOKEN'));
});
test('complete status with diagnostic is still incomplete and strips raw errors',()=>{
  const a=assessment([], 'complete',[],[diagnostic]);
  assert.equal(a.status,'incomplete');assert.ok(!JSON.stringify(a).includes('SECRET'));
});
test('no findings is no-supported-evidence, not a pass or ready',()=>{
  const a=assessment([]);
  assert.equal(a.triage,'no-supported-evidence');assert.equal(a.status,'complete');assert.equal(a.summary.highestSeverity,null);
  assert.equal(a.summary.manualReviewRequired,0);
});
test('finding ordering is severity first, then uncertainty and location',()=>{
  const l=(file)=>({...L,file});
  const a=assessment([evidence(rule('horizon.http.ledger-list'),l('z.ts')),
    evidence(rule('horizon.http.account-list'),l('b.ts')),
    evidence(rule('horizon.sdk.payments'),l('a.ts'))]);
  assert.deepEqual(a.findings.map(f=>f.ruleId),['horizon.sdk.payments','horizon.http.account-list','horizon.http.ledger-list']);
});
test('risk stable ID same for repeated input and changes with location',()=>{
  const a=assessment([evidence(rule('horizon.http.ledger-list'))]).findings[0];
  assert.match(a.id,/^[a-f0-9]{32}$/);
  assert.equal(a.id,assessment([evidence(rule('horizon.http.ledger-list'))]).findings[0].id);
  assert.notEqual(a.id,assessment([evidence(rule('horizon.http.ledger-list'),{...L,start:{line:4,column:2},end:{line:4,column:18}})]).findings[0].id);
});
test('deduplicate exact same source evidence',()=>{
  const e=evidence(rule('horizon.http.ledger-list'));
  assert.equal(assessment([e,e]).findings.length,1);
});
test('different rules at same location are retained',()=>{
  const a=assessment([evidence(rule('horizon.http.ledger-list')),evidence(rule('horizon.http.account-list'))]);
  assert.equal(a.findings.length,2);
});
test('repeated reverse order yields byte-identical canonical output',()=>{
  const inputs=RULES.map((r,i)=>evidence(r,{...L,file:`src/${String(i).padStart(2,'0')}.ts`}));
  const a=assessment(inputs),b=assessment(inputs.reverse());
  assert.equal(JSON.stringify(a),JSON.stringify(b));
  assert.equal(a.summary.findings,25);
});
test('risk summary counts all categories without collapsing confidence',()=>{
  const a=assessment(RULES.map(evidence=>({kind:evidence.detectionKind,pattern:evidence.matchTarget,location:L})));
  assert.equal(Object.values(a.summary.bySeverity).reduce((x,y)=>x+y,0),25);
  assert.equal(Object.values(a.summary.byMappingKind).reduce((x,y)=>x+y,0),25);
  assert.equal(a.summary.highestSeverity,'high');
});
test('cannot edit class severity to hide a high priority indexer',()=>{
  const [item]=classifyHorizonFindings([evidence(rule('horizon.http.account-list'))]);
  const forged={...item,severity:'info'};
  assert.throws(()=>assessClassifiedDetection({status:'complete',findings:[forged],unknowns:[],diagnostics:[]}),TypeError);
});
test('cannot forge optimistic mapping or misrepresent rules',()=>{
  const [item]=classifyHorizonFindings([evidence(rule('horizon.http.account-list'))]);
  for(const bad of [{...item,mappingKind:'direct'},{...item,ruleId:'horizon.http.ledger-list'},{...item,confidence:'unknown'},{...item,ruleSetVersion:'2.0.0'}]){
    assert.throws(()=>assessClassifiedDetection({status:'complete',findings:[bad],unknowns:[],diagnostics:[]}),TypeError);
  }
});
test('malicious recommendations and source fields not surfaced',()=>{
  const [item]=classifyHorizonFindings([evidence(rule('horizon.http.ledger-list'))]);
  const a=assessClassifiedDetection({status:'complete',findings:[{...item,recommendation:'PRIVATEKEY=ABC',limitations:['SECRET123'],officialSources:[{url:'https://example.net/secret'}],other:'TOP_SECRET'}],unknowns:[],diagnostics:[]});
  assert.ok(!JSON.stringify(a).includes('PRIVATEKEY'));
  assert.ok(!JSON.stringify(a).includes('SECRET123'));
  assert.ok(!JSON.stringify(a).includes('example.net'));
  assert.ok(!JSON.stringify(a).includes('TOP_SECRET'));
});
test('rejects malformed classification array/status and oversized collections',()=>{
  for(const input of [null,{}, {status:'ready',findings:[],unknowns:[],diagnostics:[]},
    {status:'complete',findings:null,unknowns:[],diagnostics:[]},
    {status:'complete',findings:Array(20001).fill(null),unknowns:[],diagnostics:[]},
    {status:'complete',findings:[],unknowns:'secret',diagnostics:[]}]) {
    assert.throws(()=>assessClassifiedDetection(input),TypeError);
  }
});
test('rejects unsafe paths in findings, unknowns and diagnostics',()=>{
  const f=classifyHorizonFindings([evidence(rule('horizon.http.ledger-list'))])[0];
  for(const file of ['../escape.ts','/tmp/p.ts','C:\\secrets.ts','x//y.ts','a\u0000b.ts']){
    assert.throws(()=>assessClassifiedDetection({status:'complete',findings:[{...f,location:{...L,file}}],unknowns:[],diagnostics:[]}),TypeError);
    assert.throws(()=>assessment([], 'complete',[{...unknown,location:{...L,file}}]),TypeError);
    assert.throws(()=>assessment([], 'complete',[],[{...diagnostic,file}]),TypeError);
  }
});
test('rejects prototype-chain unknown code and invalid diagnostic codes',()=>{
  for(const code of ['constructor','__proto__','toString','BAD_SECRET=1'])assert.throws(()=>assessment([], 'complete',[{...unknown,code}]),TypeError);
  assert.throws(()=>assessment([], 'complete',[],[{...diagnostic,code:'password=key'}]),TypeError);
});
test('deduplicates and sorts unknowns and diagnostics deterministically',()=>{
  const unknown2={...unknown,location:{...L,file:'z.ts'}};
  const diagnostic2={...diagnostic,file:'x.ts'};
  const a=assessment([], 'incomplete',[unknown2,unknown,unknown], [diagnostic2,diagnostic,diagnostic]);
  const b=assessment([], 'incomplete',[unknown,unknown2], [diagnostic,diagnostic2]);
  assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(a.summary.unknowns,2);assert.equal(a.summary.diagnostics,2);
});
test('sanitizes ordinary dynamic incomplete source',()=>{
  const r=assessHorizonUsage('app.ts',"fetch('https://horizon.stellar.org/' + process.env.SECRET_PATH)");
  assert.equal(r.status,'incomplete');assert.equal(r.triage,'incomplete');assert.ok(r.unknowns.length);
  assert.ok(!JSON.stringify(r).includes('SECRET_PATH'));
});
test('malformed syntax emits incomplete without fake findings',()=>{
  const r=assessHorizonUsage('src/app.ts',"fetch('https://horizon.stellar.org/accounts'); const x = (");
  assert.equal(r.status,'incomplete');assert.equal(r.findings.length,0);
  assert.ok(r.diagnostics.some(d=>d.code==='INVALID_SYNTAX'));
});
test('legitimate HTTP indexer need survives source -> risk pipeline',()=>{
  const r=assessHorizonUsage('src/query.ts',"const resp=await fetch('https://horizon-testnet.stellar.org/accounts');");
  assert.equal(r.status,'complete');const f=r.findings.find(x=>x.ruleId==='horizon.http.account-list');
  assert.ok(f);assert.equal(f.severity,'high');assert.ok(f.officialSources.length);
});
test('unrelated HTTP request and harmless comments do not cause findings',()=>{
  const r=assessHorizonUsage('src/query.ts',"// fetch('https://horizon.stellar.org/accounts')\nfetch('https://example.org/accounts');");
  assert.equal(r.summary.findings,0);assert.equal(r.triage,'no-supported-evidence');
});
test('does not execute inspected code',()=>{
  const r=assessHorizonUsage('danger.js',"throw new Error('WOULD_EXECUTE');\nfetch('https://horizon.stellar.org/payments');");
  assert.equal(r.findings.length,1);
  assert.ok(!JSON.stringify(r).includes('WOULD_EXECUTE'));
});
test('regression: extra keys in source locations cannot leak into findings or unknowns',()=>{
  const dirtyLoc={file:'src/app.ts',start:{line:1,column:1,accessToken:'START_SECRET'},end:{line:1,column:10,accessToken:'END_SECRET'},header:'PRIVATE_HEADER'};
  const r=assessment([evidence(rule('horizon.http.ledger-list'),dirtyLoc)],'incomplete',[{...unknown,location:dirtyLoc}]);
  const serialized=JSON.stringify(r);
  for(const secret of ['START_SECRET','END_SECRET','PRIVATE_HEADER'])assert.ok(!serialized.includes(secret));
  assert.deepEqual(Object.keys(r.findings[0].location),['file','start','end']);
  assert.deepEqual(Object.keys(r.unknowns[0].location),['file','start','end']);
});
test('rejects arbitrary diagnostic identifiers that might contain private data',()=>{
  for(const code of ['MY_SECRET_CODE','TOP_SECRET', 'x/../TOKEN', 'INVALID_SYNTAX\nsecret']){
    assert.throws(()=>assessment([],'complete',[],[{...diagnostic,code}]),TypeError);
  }
});
