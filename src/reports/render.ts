/**
 * Canonical, secret-minimizing reporting boundary for source-checkout CLI.
 * Rebuilds all advice and risk metadata from vetted rules; no caller-supplied
 * recommendation, diagnostic message, source excerpt or machine path is printed.
 */
import { assessClassifiedDetection, type RepositoryRiskAssessment, type RiskFinding } from '../analysis/risk.ts';
import { classifyHorizonFindings, RULES, RULE_SET_VERSION, type MigrationRule, type Severity } from '../rules/catalog.ts';

export const REPORT_SCHEMA_VERSION = '1.0.0' as const;
export const MAX_REPORT_BYTES = 32 * 1024 * 1024;
const ORDER:Readonly<Record<Severity,number>>={info:0,low:1,medium:2,high:3};
const CONTROL=/[\u2028\u2029\u202a-\u202e\u2066-\u2069\u0085]/;
const VERSION=/^\d{1,4}\.\d{1,4}\.\d{1,4}(?:-[a-zA-Z0-9.-]{1,48})?$/;
const safeNumber=(x:unknown):x is number=>Number.isSafeInteger(x)&&Number(x)>=0&&Number(x)<=20000;
const validReport=(r:unknown):r is RepositoryRiskAssessment=>!!r&&typeof r==='object'&&!Array.isArray(r);
export class ReportValidationError extends TypeError {
  constructor(){super('Invalid or unsafe report input.');this.name='ReportValidationError';}
}
function fail():never {throw new ReportValidationError();}
function safePath(p:string):boolean {return !CONTROL.test(p);}
const equal=(a:unknown,b:unknown):boolean=>JSON.stringify(a)===JSON.stringify(b);

/**
 * Reevaluate the original detector evidence under the immutable vetted catalog.
 * Any fabricated risk downgrades, locations, totals or triage fail closed.
 * Extra untrusted object properties are silently dropped, not serialized.
 */
export function normalizeScanReport(report:unknown):RepositoryRiskAssessment {
  if(!validReport(report)||report.root!=='.'||!safeNumber(report.filesInspected)||
     report.schemaVersion!==REPORT_SCHEMA_VERSION||report.ruleSetVersion!==RULE_SET_VERSION||
     !['complete','incomplete'].includes(report.status)||!Array.isArray(report.findings)||
     !Array.isArray(report.unknowns)||!Array.isArray(report.diagnostics))fail();
  if(report.findings.length>20000||report.unknowns.length>20000||report.diagnostics.length>20000)fail();
  try{
    const findings=classifyHorizonFindings(report.findings.map((f:RiskFinding)=>{
      if(!f||typeof f!=='object'||!f.location||typeof f.location.file!=='string'||!safePath(f.location.file))fail();
      return {kind:f.detectionKind,pattern:f.detectorPattern,location:f.location};
    }));
    const canonical=assessClassifiedDetection({status:report.status,findings,unknowns:report.unknowns,diagnostics:report.diagnostics});
    if(report.status!==canonical.status||report.triage!==canonical.triage||!equal(report.summary,canonical.summary)||
      report.findings.length!==canonical.findings.length||report.unknowns.length!==canonical.unknowns.length||
      report.diagnostics.length!==canonical.diagnostics.length)fail();
    // Canonical finding identity/risk/confidence must not be forged or reordered.
    for(let i=0;i<canonical.findings.length;i++){
      const x=report.findings[i]!,y=canonical.findings[i]!;
      if(!equal([x.id,x.ruleId,x.ruleVersion,x.detectionKind,x.detectorPattern,x.location,x.mappingKind,x.severity,x.confidence,x.reasonCodes],
        [y.id,y.ruleId,y.ruleVersion,y.detectionKind,y.detectorPattern,y.location,y.mappingKind,y.severity,y.confidence,y.reasonCodes]))fail();
    }
    // Unknowns/diagnostics may arrive with injected messages, but their vetted
    // codes, locations and fixed canonical messages must remain consistent.
    for(let i=0;i<canonical.unknowns.length;i++){
      const x=report.unknowns[i]!,y=canonical.unknowns[i]!;
      if(x.code!==y.code||!equal(x.location,y.location))fail();
      if(!safePath(y.location.file))fail();
    }
    for(let i=0;i<canonical.diagnostics.length;i++){
      const x=report.diagnostics[i]!,y=canonical.diagnostics[i]!;
      if(x.code!==y.code||x.file!==y.file||!!(y.file&& !safePath(y.file)))fail();
    }
    const cloned=canonical.findings.map(f=>({id:f.id,ruleId:f.ruleId,ruleVersion:f.ruleVersion,
      detectionKind:f.detectionKind,detectorPattern:f.detectorPattern,
      location:{file:f.location.file,start:{line:f.location.start.line,column:f.location.start.column},end:{line:f.location.end.line,column:f.location.end.column}},
      mappingKind:f.mappingKind,severity:f.severity,confidence:f.confidence,reasonCodes:[...f.reasonCodes],
      recommendedAction:f.recommendedAction,rpcMethods:[...f.rpcMethods],
      officialSources:f.officialSources.map(s=>({url:s.url,checkedDate:s.checkedDate,note:s.note})),limitations:[...f.limitations]}));
    return {schemaVersion:REPORT_SCHEMA_VERSION,ruleSetVersion:RULE_SET_VERSION,root:'.',filesInspected:report.filesInspected,
      status:canonical.status,triage:canonical.triage,
      summary:{findings:canonical.summary.findings,unknowns:canonical.summary.unknowns,diagnostics:canonical.summary.diagnostics,
        highestSeverity:canonical.summary.highestSeverity,
        bySeverity:{info:canonical.summary.bySeverity.info,low:canonical.summary.bySeverity.low,medium:canonical.summary.bySeverity.medium,high:canonical.summary.bySeverity.high},
        byMappingKind:{direct:canonical.summary.byMappingKind.direct,conditional:canonical.summary.byMappingKind.conditional,
          'indexer-required':canonical.summary.byMappingKind['indexer-required'],
          'no-direct-rpc-equivalent':canonical.summary.byMappingKind['no-direct-rpc-equivalent'],unknown:canonical.summary.byMappingKind.unknown},
        manualReviewRequired:canonical.summary.manualReviewRequired},
      findings:cloned,unknowns:canonical.unknowns.map(x=>({code:x.code,location:{file:x.location.file,start:{...x.location.start},end:{...x.location.end}},message:x.message})),
      diagnostics:canonical.diagnostics.map(x=>({code:x.code,file:x.file,message:x.message}))};
  }catch{fail();}
}
function printJson(payload:unknown):string {
  // JSON.stringify in insertion order: every payload is rebuilt with fixed keys.
  const result=JSON.stringify(payload)+'\n';
  if(Buffer.byteLength(result,'utf8')>MAX_REPORT_BYTES)fail();
  return result;
}
function version(v:string):void{if(typeof v!=='string'||!VERSION.test(v))fail();}
function safeRules(rules:readonly MigrationRule[]):readonly MigrationRule[]{
  if(!Array.isArray(rules)||rules.length!==RULES.length)fail();
  for(let i=0;i<RULES.length;i++)if(!equal(rules[i],RULES[i]))fail();
  return RULES;
}
/** v1 stable JSON schema; contains all findings regardless of text display threshold. */
export function renderScanJson(report:RepositoryRiskAssessment,toolVersion:string):string {
  version(toolVersion);
  const r=normalizeScanReport(report);
  return printJson({schemaVersion:REPORT_SCHEMA_VERSION,toolVersion,ruleSetVersion:r.ruleSetVersion,
    root:r.root,filesInspected:r.filesInspected,status:r.status,triage:r.triage,
    summary:r.summary,findings:r.findings,unknowns:r.unknowns,diagnostics:r.diagnostics});
}
export function renderScanText(report:RepositoryRiskAssessment,minimum:Severity='info'):string {
  if(!Object.hasOwn(ORDER,minimum))fail();
  const r=normalizeScanReport(report);
  const displayed=r.findings.filter(f=>ORDER[f.severity]>=ORDER[minimum]);
  const out=[`HoriSift scan: ${r.status} (${r.triage})`,
    `Inspected: ${r.filesInspected} | Findings: ${r.summary.findings} (displayed: ${displayed.length}) | Unknowns: ${r.summary.unknowns} | Diagnostics: ${r.summary.diagnostics}`,
    'Static triage only; NOT proof of migration readiness.'];
  for(const f of displayed) {
    out.push(`${f.severity} [${f.confidence}] ${f.location.file}:${f.location.start.line}:${f.location.start.column} ${f.ruleId} (${f.mappingKind})`);
    out.push(`  Review: ${f.recommendedAction}`);
  }
  for(const u of r.unknowns)out.push(`unknown ${u.location.file}:${u.location.start.line}:${u.location.start.column} ${u.code}`);
  for(const d of r.diagnostics)out.push(`diagnostic ${d.file??'.'} ${d.code}`);
  const rendered=out.join('\n')+'\n';if(Buffer.byteLength(rendered,'utf8')>MAX_REPORT_BYTES)fail();return rendered;
}
export function renderRulesJson(rules:readonly MigrationRule[],toolVersion:string):string {
  version(toolVersion);const trusted=safeRules(rules);
  return printJson({schemaVersion:REPORT_SCHEMA_VERSION,toolVersion,ruleSetVersion:RULE_SET_VERSION,
    rules:trusted.map(r=>({id:r.id,version:r.version,name:r.name,detectionKind:r.detectionKind,
      matchTarget:r.matchTarget,mappingKind:r.mappingKind,rpcMethods:[...r.rpcMethods],
      severity:r.severity,confidence:r.confidence,recommendation:r.recommendation,
      officialSources:r.officialSources.map(s=>({url:s.url,checkedDate:s.checkedDate,note:s.note})),limitations:[...r.limitations]}))});
}
export function renderRulesText(rules:readonly MigrationRule[]):string {
  const trusted=safeRules(rules);
  const lines=[`HoriSift rules (catalog ${RULE_SET_VERSION}; ${trusted.length} rules)`,
    'Mappings are advisory; never assume identical Horizon/RPC behavior.',
    ...trusted.map(r=>`${r.id} | ${r.mappingKind} | ${r.rpcMethods.length?r.rpcMethods.join(','):'manual review'}`)];
  const rendered=lines.join('\n')+'\n';if(Buffer.byteLength(rendered,'utf8')>MAX_REPORT_BYTES)fail();return rendered;
}
