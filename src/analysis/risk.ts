/**
 * Conservative, versioned triage of known Horizon detector evidence.
 * This is a static migration-work assessment, NOT a security audit, a
 * migration plan, or evidence that an application is safe to migrate.
 * Never reads or executes scanned application code or calls the network.
 */
import { createHash } from 'node:crypto';
import { classifyHorizonDetection, classifyHorizonFindings, type ClassifiedFinding, type ClassificationResult, type Confidence, type MappingKind, type Severity, RULE_SET_VERSION } from '../rules/catalog.ts';
import { detectHorizonUsage, detectHorizonRepository, type HorizonDetection, type HorizonRepositoryDetection, type HorizonUnknown } from './horizon.ts';
import type { DiscoveryOptions } from '../scanner/discover.ts';
import type { Location } from '../parser/parse.ts';

export const RISK_SCHEMA_VERSION = '1.0.0' as const;
export type RiskReason = 'INDEXER_REQUIRED' | 'NO_DIRECT_RPC_EQUIVALENT' | 'UNMAPPED_HORIZON_PATTERN' | 'CONDITIONAL_MIGRATION' | 'DIRECT_API_MAPPING_NOT_PARITY' | 'CLASSIC_EVENTS_REQUIRE_PROVIDER_CHECK' | 'RPC_HISTORY_LIMIT' | 'STREAMING_REDESIGN' | 'HAL_RESPONSE_REWRITE' | 'ACCOUNT_RESPONSE_DIFFERENCE' | 'TRANSACTION_STATUS_LIFECYCLE' | 'INCOMPLETE_DETECTOR_COVERAGE' | 'APPLICATION_REVIEW_REQUIRED';
export type TriageStatus = 'incomplete' | 'review-required' | 'no-supported-evidence';
export interface RiskFinding {
  id: string;
  ruleId: string;
  ruleVersion: string;
  detectionKind: ClassifiedFinding['detectionKind'];
  detectorPattern: string;
  location: Location;
  mappingKind: MappingKind;
  severity: Severity;
  /** Confidence the detector and documented rule apply, not confidence in migration success. */
  confidence: Confidence;
  reasonCodes: readonly RiskReason[];
  recommendedAction: string;
  rpcMethods: readonly string[];
  officialSources: ClassifiedFinding['officialSources'];
  limitations: ClassifiedFinding['limitations'];
}
export interface RiskUnknown { code: HorizonUnknown['code']; location: Location; message: string }
export interface RiskDiagnostic { code: string; file: string | null; message: string }
export interface RiskSummary {
  findings: number;
  unknowns: number;
  diagnostics: number;
  highestSeverity: Severity | null;
  bySeverity: Record<Severity, number>;
  byMappingKind: Record<MappingKind, number>;
  manualReviewRequired: number;
}
export interface RiskAssessment {
  schemaVersion: typeof RISK_SCHEMA_VERSION;
  ruleSetVersion: typeof RULE_SET_VERSION;
  status: 'complete' | 'incomplete';
  triage: TriageStatus;
  /** Explicitly counts concerns, not an app readiness score. */
  summary: RiskSummary;
  findings: RiskFinding[];
  unknowns: RiskUnknown[];
  diagnostics: RiskDiagnostic[];
}
export interface RepositoryRiskAssessment extends RiskAssessment {
  root: '.';
  filesInspected: number;
}

const SEVERITY: Readonly<Record<Severity, number>> = { info: 0, low: 1, medium: 2, high: 3 };
const sevMax = (a: Severity, b: Severity): Severity => SEVERITY[a] >= SEVERITY[b] ? a : b;
const ordinal = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const validFile = (p: unknown): p is string => typeof p === 'string' && p.length > 0 && p.length <= 1024 &&
  !p.startsWith('/') && !p.includes('\\') && p.split('/').every(s => s !== '' && s !== '.' && s !== '..' && !/[\x00-\x1f\x7f]/.test(s));
const validLocation = (l: unknown): l is Location => {
  if (!l || typeof l !== 'object') return false;
  const p = l as Location;
  const pos = [p.start?.line, p.start?.column, p.end?.line, p.end?.column];
  return validFile(p.file) && pos.every(n => Number.isSafeInteger(n) && n > 0) &&
    (p.end.line > p.start.line || (p.end.line === p.start.line && p.end.column >= p.start.column));
};
const UNKNOWN_MESSAGES: Readonly<Record<HorizonUnknown['code'], string>> = {
  DYNAMIC_HORIZON_URL: 'Horizon client URL cannot be determined statically.',
  DYNAMIC_HTTP_URL: 'Possible Horizon request address cannot be determined statically.',
  DYNAMIC_HORIZON_CALL: 'Computed Horizon method cannot be determined statically.',
  MUTABLE_SDK_BINDING: 'A mutable SDK binding cannot be trusted statically.',
  DYNAMIC_HTTP_METHOD: 'Horizon HTTP method cannot be determined statically.',
  LEGACY_SDK_SERVER: 'Legacy Stellar SDK Server requires manual Horizon dependency assessment.',
};
const ALLOWED_DIAGNOSTICS = new Set([
  'INVALID_SYNTAX', 'UNSUPPORTED_EXTENSION', 'INVALID_SOURCE', 'SOURCE_TOO_LARGE', 'DYNAMIC_MODULE',
  'INVALID_PATH', 'INVALID_ROOT', 'SYMLINK_SKIPPED', 'PATH_OUTSIDE_ROOT', 'FILE_CHANGED',
  'FILE_UNREADABLE', 'FILE_TOO_LARGE', 'INVALID_ENCODING', 'DIRECTORY_UNREADABLE',
  'UNSUPPORTED_INPUT', 'DEPTH_LIMIT', 'DIRECTORY_LIMIT', 'ENTRY_LIMIT', 'FILE_LIMIT',
  'TOTAL_BYTES_LIMIT', 'PATH_TOO_LONG', 'UNSAFE_PATH', 'NO_SUPPORTED_FILES',
]);
const validDiagnosticCode = (v: unknown): v is string => typeof v === 'string' && ALLOWED_DIAGNOSTICS.has(v);
const cleanLocation = (p: Location): Location => ({
  file:p.file,
  start:{line:p.start.line,column:p.start.column},
  end:{line:p.end.line,column:p.end.column},
});
const sortLocation = (a: Location, b: Location): number => ordinal(a.file, b.file) || a.start.line - b.start.line || a.start.column - b.start.column || a.end.line - b.end.line || a.end.column - b.end.column;
function sanitizeUnknowns(value: unknown): RiskUnknown[] {
  if (!Array.isArray(value) || value.length > 20000) throw new TypeError('Invalid detector unknowns');
  const result = value.map(u => {
    if (!u || typeof u !== 'object' || !Object.hasOwn(UNKNOWN_MESSAGES, u.code) || !validLocation(u.location)) throw new TypeError('Invalid detector unknown');
    const code = u.code as HorizonUnknown['code'];
    return {code, location: cleanLocation(u.location as Location), message: UNKNOWN_MESSAGES[code]};
  });
  result.sort((a,b) => sortLocation(a.location,b.location) || ordinal(a.code,b.code));
  return result.filter((u,i) => i === 0 || u.code !== result[i-1]!.code || sortLocation(u.location,result[i-1]!.location) !== 0);
}
function sanitizeDiagnostics(value: unknown): RiskDiagnostic[] {
  if (!Array.isArray(value) || value.length > 20000) throw new TypeError('Invalid detector diagnostics');
  const result = value.map(d => {
    if (!d || typeof d !== 'object' || !validDiagnosticCode(d.code) || !(d.file === null || validFile(d.file))) throw new TypeError('Invalid coverage diagnostic');
    return {code: d.code as string, file: d.file as string|null, message: 'Review this coverage diagnostic before relying on findings.'};
  });
  result.sort((a,b) => ordinal(a.file ?? '', b.file ?? '') || ordinal(a.code,b.code));
  return result.filter((d,i) => i === 0 || d.code !== result[i-1]!.code || d.file !== result[i-1]!.file);
}
function requireCanonicalClassifications(findings: unknown): ClassifiedFinding[] {
  if (!Array.isArray(findings) || findings.length > 20000) throw new TypeError('Invalid classified findings');
  const normalized = findings.map(f => {
    if (!f || typeof f !== 'object' || typeof f.detectionKind !== 'string' || typeof f.detectorPattern !== 'string') throw new TypeError('Invalid classified finding');
    if (!validLocation(f.location)) throw new TypeError('Invalid classified source location');
    const canonical = classifyHorizonFindings([{kind:f.detectionKind, pattern:f.detectorPattern, location:cleanLocation(f.location)}])[0]!;
    if (f.ruleId !== canonical.ruleId || f.ruleVersion !== canonical.ruleVersion || f.ruleSetVersion !== canonical.ruleSetVersion ||
      f.mappingKind !== canonical.mappingKind || f.confidence !== canonical.confidence || f.severity !== canonical.severity) {
      throw new TypeError('Classification does not match vetted rule catalog');
    }
    return canonical; // ignore all untrusted source-derived metadata and recommendations
  });
  normalized.sort((a,b) => sortLocation(a.location,b.location) || ordinal(a.ruleId,b.ruleId) || ordinal(a.detectorPattern,b.detectorPattern));
  return normalized.filter((f,i) => i === 0 || f.ruleId !== normalized[i-1]!.ruleId || f.detectorPattern !== normalized[i-1]!.detectorPattern || sortLocation(f.location,normalized[i-1]!.location) !== 0);
}
function reasons(f: ClassifiedFinding): RiskReason[] {
  const output: RiskReason[] = [];
  const mapping: Readonly<Record<MappingKind,RiskReason>> = {
    'direct':'DIRECT_API_MAPPING_NOT_PARITY', 'conditional':'CONDITIONAL_MIGRATION',
    'indexer-required':'INDEXER_REQUIRED', 'no-direct-rpc-equivalent':'NO_DIRECT_RPC_EQUIVALENT',
    'unknown':'UNMAPPED_HORIZON_PATTERN',
  };
  output.push(mapping[f.mappingKind]);
  if (f.ruleId.includes('payments') || f.ruleId.includes('effects')) output.push('CLASSIC_EVENTS_REQUIRE_PROVIDER_CHECK');
  if (f.ruleId === 'horizon.sdk.streaming') output.push('STREAMING_REDESIGN');
  if (f.ruleId === 'horizon.http.hal-records' || f.ruleId === 'horizon.sdk.records') output.push('HAL_RESPONSE_REWRITE');
  if (f.ruleId === 'horizon.sdk.load-account' || f.ruleId === 'horizon.http.account-detail') output.push('ACCOUNT_RESPONSE_DIFFERENCE');
  if (f.ruleId === 'horizon.sdk.submit-transaction' || f.ruleId === 'horizon.http.transaction-submit') output.push('TRANSACTION_STATUS_LIFECYCLE');
  if (f.limitations.some(v => /bounded recent history|recent history window|historical/i.test(v))) output.push('RPC_HISTORY_LIMIT');
  output.push('APPLICATION_REVIEW_REQUIRED');
  return output;
}
function assessOne(f: ClassifiedFinding): RiskFinding {
  let severity=f.severity;
  if (f.mappingKind === 'indexer-required' || f.mappingKind === 'no-direct-rpc-equivalent') severity=sevMax(severity,'high');
  if (f.mappingKind === 'unknown') severity=sevMax(severity,'medium');
  if (f.ruleId === 'horizon.sdk.streaming') severity=sevMax(severity,'high');
  const confidence:Confidence=f.mappingKind === 'unknown'?'unknown':f.confidence;
  const id = createHash('sha256').update(JSON.stringify([f.ruleSetVersion,f.ruleId,f.detectionKind,f.detectorPattern,f.location])).digest('hex').slice(0,32);
  return {id,ruleId:f.ruleId,ruleVersion:f.ruleVersion,detectionKind:f.detectionKind,detectorPattern:f.detectorPattern,
    location:f.location,mappingKind:f.mappingKind,severity,confidence,reasonCodes:reasons(f),recommendedAction:f.recommendation,
    rpcMethods:f.rpcMethods,officialSources:f.officialSources,limitations:f.limitations};
}
/** Evaluates only vetted, exact-rule classifications; rejects tampering. */
export function assessClassifiedDetection(classification: ClassificationResult): RiskAssessment {
  if (!classification || (classification.status !== 'complete' && classification.status !== 'incomplete')) throw new TypeError('Invalid classification status');
  const findings=requireCanonicalClassifications(classification.findings).map(assessOne);
  // Most consequential supported findings first; never change confidence to fabricate certainty.
  const priority:Readonly<Record<Confidence,number>>={unknown:0,medium:1,high:2};
  findings.sort((a,b)=>SEVERITY[b.severity]-SEVERITY[a.severity] || priority[a.confidence]-priority[b.confidence] || sortLocation(a.location,b.location) || ordinal(a.ruleId,b.ruleId) || ordinal(a.id,b.id));
  const unknowns=sanitizeUnknowns(classification.unknowns);
  const diagnostics=sanitizeDiagnostics(classification.diagnostics);
  const status:RiskAssessment['status'] = classification.status==='incomplete'||unknowns.length>0||diagnostics.length>0?'incomplete':'complete';
  const bySeverity:Record<Severity,number>={info:0,low:0,medium:0,high:0};
  const byMappingKind:Record<MappingKind,number>={direct:0,conditional:0,'indexer-required':0,'no-direct-rpc-equivalent':0,unknown:0};
  let highestSeverity:Severity|null=null;
  for(const finding of findings){bySeverity[finding.severity]++;byMappingKind[finding.mappingKind]++;highestSeverity=highestSeverity===null?finding.severity:sevMax(highestSeverity,finding.severity);}
  const summary:RiskSummary={findings:findings.length,unknowns:unknowns.length,diagnostics:diagnostics.length,highestSeverity,bySeverity,byMappingKind,manualReviewRequired:findings.length+unknowns.length+diagnostics.length+(status==='incomplete'&&unknowns.length===0&&diagnostics.length===0?1:0)};
  const triage:TriageStatus=status==='incomplete'?'incomplete':findings.length?'review-required':'no-supported-evidence';
  return {schemaVersion:RISK_SCHEMA_VERSION,ruleSetVersion:RULE_SET_VERSION,status,triage,summary,findings,unknowns,diagnostics};
}
/** Local string entry point: parsing -> detector -> exact rules -> conservative triage. */
export function assessHorizonUsage(file:string,source:string):RiskAssessment{
  return assessClassifiedDetection(classifyHorizonDetection(detectHorizonUsage(file,source)));
}
/** Repository entry point: never imports, runs, modifies or uploads target source. */
export async function assessHorizonRepository(rootPath:string,options:DiscoveryOptions={}):Promise<RepositoryRiskAssessment>{
  const detection:HorizonRepositoryDetection=await detectHorizonRepository(rootPath,options);
  const classified:ClassificationResult={status:detection.status,findings:classifyHorizonFindings(detection.findings),unknowns:detection.unknowns,diagnostics:detection.diagnostics};
  const risk=assessClassifiedDetection(classified);
  return {...risk,root:'.',filesInspected:detection.summary.filesInspected};
}
