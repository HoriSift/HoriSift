import test from 'node:test';
import assert from 'node:assert/strict';
import {assessHorizonUsage} from '../../src/analysis/risk.ts';
import {RULES} from '../../src/rules/catalog.ts';
import {normalizeScanReport,renderScanJson,renderScanText,renderRulesJson,renderRulesText,REPORT_SCHEMA_VERSION,MAX_REPORT_BYTES,ReportValidationError} from '../../src/reports/render.ts';
const assessment=(source="fetch('https://horizon.stellar.org/accounts');",file='src/a.ts')=>({...assessHorizonUsage(file,source),root:'.',filesInspected:1});
const partial=()=>assessment('const broken = (');
const render=(x)=>JSON.parse(renderScanJson(x,'0.0.0'));
test('emits v1 canonical keys and preserves all findings',()=>{
 const report=render(assessment());
 assert.deepEqual(Object.keys(report),['schemaVersion','toolVersion','ruleSetVersion','root','filesInspected','status','triage','summary','findings','unknowns','diagnostics']);
 assert.equal(report.schemaVersion,REPORT_SCHEMA_VERSION);assert.equal(report.toolVersion,'0.0.0');
 assert.equal(report.status,'complete');assert.equal(report.summary.findings,report.findings.length);assert.equal(report.root,'.');
 assert.equal(report.triage,'review-required');
});
test('stable output repeated, even with unexpected extra properties',()=>{
 const a=assessment();const base=renderScanJson(a,'0.0.0');a.extra='PRIVATE:TOP_SECRET';a.findings[0].note='PRIVATE:TOP_SECRET';
 assert.equal(renderScanJson(a,'0.0.0'),base);assert.ok(!base.includes('TOP_SECRET'));
});
test('complete empty is no-supported-evidence, never safe',()=>{
 const report=render(assessment('let n=3;'));
 assert.equal(report.triage,'no-supported-evidence');assert.equal(report.summary.findings,0);assert.doesNotMatch(JSON.stringify(report),/migrationReady|"safe"/);
});
test('incomplete emits explicit status, diagnostic and warning text',()=>{
 const x=partial(),o=render(x),s=renderScanText(x);
 assert.equal(o.status,'incomplete');assert.equal(o.triage,'incomplete');assert.ok(o.diagnostics.length);
 assert.match(s,/incomplete/);assert.match(s,/NOT proof of migration readiness/);
});
test('risk severity remains independent of confidence in output',()=>{
 const report=render(assessment("fetch('https://horizon.stellar.org/accounts');"));
 assert.equal(report.findings[0].severity,'high');assert.ok(['high','medium','unknown'].includes(report.findings[0].confidence));
});
test('text severity filters displayed findings but never JSON data',()=>{
 const x=assessment("import {Horizon} from '@stellar/stellar-sdk';\nconst h=new Horizon.Server('https://horizon.stellar.org');\nh.accounts().call();");
 const all=renderScanJson(x,'0.0.0');const high=renderScanText(x,'high');const info=renderScanText(x,'info');
 assert.ok(high.length<=info.length);assert.equal(renderScanJson(x,'0.0.0'),all);
});
test('rules output is official catalog and has schema version',()=>{
 const o=JSON.parse(renderRulesJson(RULES,'0.0.0'));
 assert.equal(o.schemaVersion,'1.0.0');assert.equal(o.rules.length,25);
 assert.match(renderRulesText(RULES),/advisory/);
});
test('rejects tampered rule catalog rather than reflecting malicious sources',()=>{
 const changed=structuredClone(RULES);changed[0].recommendation='TOP_SECRET /etc/private';
 assert.throws(()=>renderRulesJson(changed,'0.0.0'),ReportValidationError);
 assert.throws(()=>renderRulesText(changed),ReportValidationError);
});
for(const v of ['', '0','../../../x','hello\nPRIVATE', '999999.0.0','0.0.0\u001b']){
 test(`rejects invalid tool version ${JSON.stringify(v)}`,()=>assert.throws(()=>renderScanJson(assessment(),v),ReportValidationError));
}
for(const [label, mutate] of [
 ['forged status',r=>{r.status='incomplete';r.triage='incomplete';}],
 ['forged total',r=>{r.summary.findings=0;}],
 ['forged severity',r=>{r.findings[0].severity='info';}],
 ['forged confidence',r=>{r.findings[0].confidence='unknown';}],
 ['forged rule',r=>{r.findings[0].ruleId='secret.rule';}],
 ['forged ID',r=>{r.findings[0].id='TOP_SECRET';}],
 ['forged reason',r=>{r.findings[0].reasonCodes=['FAKE_SAFE'];}],
 ['absolute root',r=>{r.root='/home/user/project';}],
 ['unsafe path',r=>{r.findings[0].location.file='../private.txt';}],
 ['bidi path',r=>{r.findings[0].location.file='secret\u202eexe.ts';}],
 ['negative file count',r=>{r.filesInspected=-1;}],
 ['wrong catalog',r=>{r.ruleSetVersion='9.9.9';}],
 ['wrong report schema',r=>{r.schemaVersion='9.9.9';}],
 ['duplicate finding',r=>{r.findings.push(structuredClone(r.findings[0]));}],
]){
 test(`fails closed against ${label}`,()=>{const x=assessment();mutate(x);assert.throws(()=>renderScanJson(x,'0.0.0'),ReportValidationError)});
}
test('untrusted diagnostic messages and extensions never reach output',()=>{
 const x=partial();x.diagnostics[0].message='secret=TOP_SECRET /etc/passwd';x.diagnostics[0].other='PRIVATE';
 const j=renderScanJson(x,'0.0.0'),t=renderScanText(x);
 assert.ok(!j.includes('TOP_SECRET')&&!t.includes('TOP_SECRET'));assert.ok(!j.includes('/etc/passwd'));
 assert.match(j,/Review this coverage diagnostic/);
});
test('untrusted finding extra fields never leak into text',()=>{
 const x=assessment();x.findings[0].recommendedAction='TOP_SECRET';x.findings[0].officialSources=[{url:'https://attacker.com?token=TOP_SECRET'}];
 const j=renderScanJson(x,'0.0.0'),t=renderScanText(x);
 assert.doesNotMatch(j+t,/TOP_SECRET|attacker\.com/);
});
test('reports have a fixed maximum output allocation',()=>assert.equal(MAX_REPORT_BYTES,32*1024*1024));
test('rejects unsupported or malformed report input',()=>{
 for(const a of [null,{},[],5,'secret',{status:'complete'}])assert.throws(()=>normalizeScanReport(a),ReportValidationError);
});
test('Unicode filenames remain deterministic and readable',()=>{
 const a=assessment("fetch('https://horizon.stellar.org/accounts');",'src/🚀-café.ts');
 assert.equal(renderScanJson(a,'0.0.0'),renderScanJson(a,'0.0.0'));
 assert.match(renderScanText(a),/🚀-café/);
});
