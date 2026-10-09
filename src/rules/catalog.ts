/**
 * Conservative, versioned migration guidance, not an automated migration plan.
 * Evidence is derived from the dated official Stellar Horizon -> RPC guide.
 * No rules trigger on arbitrary text: exact normalized Phase 04 detector patterns only.
 */
import type { HorizonFinding, HorizonKind, HorizonDetection } from '../analysis/horizon.ts';
import type { Location } from '../parser/parse.ts';

export const RULE_SET_VERSION = '1.0.0' as const;
export type MappingKind = 'direct' | 'conditional' | 'indexer-required' | 'no-direct-rpc-equivalent' | 'unknown';
export type Severity = 'info' | 'low' | 'medium' | 'high';
export type Confidence = 'high' | 'medium' | 'unknown';
export interface OfficialSource { url: string; checkedDate: string; note: string }
export interface MigrationRule {
  id: string;
  version: string;
  name: string;
  detectionKind: HorizonKind;
  matchTarget: string;
  mappingKind: MappingKind;
  /** Candidate API methods from official documentation; NOT automatic replacements. */
  rpcMethods: readonly string[];
  severity: Severity;  // default triage hint, risk analysis remains a later milestone
  confidence: Confidence; // rule applicability, not production app correctness
  recommendation: string;
  officialSources: readonly OfficialSource[];
  limitations: readonly string[];
}
export interface ClassifiedFinding {
  ruleId: string;
  ruleVersion: string;
  ruleSetVersion: typeof RULE_SET_VERSION;
  detectionKind: HorizonKind;
  detectorPattern: string;
  location: Location;
  mappingKind: MappingKind;
  rpcMethods: readonly string[];
  severity: Severity;
  confidence: Confidence;
  recommendation: string;
  officialSources: readonly OfficialSource[];
  limitations: readonly string[];
}
export interface ClassificationResult {
  status: 'complete' | 'incomplete';
  findings: ClassifiedFinding[];
  /** Unresolved detector unknowns remain unresolved; this stage cannot certify readiness. */
  unknowns: HorizonDetection['unknowns'];
  diagnostics: HorizonDetection['diagnostics'];
}
const GUIDE = 'https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc';
const RPC = 'https://developers.stellar.org/docs/data/apis/rpc';
const checkedDate = '2026-10-09';
const guide: OfficialSource = {url: GUIDE, checkedDate, note: 'Official endpoint-mapping table and classic event warning; page last updated 2026-08-18.'};
const rpc: OfficialSource = {url: RPC, checkedDate, note: 'RPC is not a Horizon drop-in or historical indexer; recent history window is provider-dependent.'};
const commonLimit = 'Horizon REST/HAL and RPC JSON-RPC response schemas differ; investigate data shape and application behavior.';
const recent = 'RPC retains only a bounded recent history window (around seven days by default, provider-dependent).';
const events = 'Classic asset events require EMIT_CLASSIC_EVENTS=true; pre-Protocol-23 history may additionally require BACKFILL_STELLAR_ASSET_EVENTS=true. Other effects require transaction meta XDR.';
const noAuto = 'Do not replace the SDK/HTTP call automatically; review filters, paging, response shape and provider capabilities.';
const source = (...extra:OfficialSource[]):readonly OfficialSource[] => [guide, ...extra];
const rule = (id:string, name:string, detectionKind:HorizonKind, matchTarget:string, mappingKind:MappingKind,
  rpcMethods:readonly string[], recommendation:string, limitations:readonly string[],
  severity:Severity='medium', confidence:Confidence='high'):MigrationRule => ({
    id, version:'1.0.0', name, detectionKind, matchTarget, mappingKind, rpcMethods, severity, confidence,
    recommendation, officialSources:source(rpc), limitations,
  });

const DEFINITIONS:readonly MigrationRule[] = [
  rule('horizon.http.ledger-list','Ledger listing','http-call','http.GET./ledgers','direct',['getLedgers'],
    'Use RPC getLedgers for the available recent ledger range; build an indexer for full history.',[recent,commonLimit]),
  rule('horizon.http.ledger-detail','Ledger by sequence','http-call','http.GET./ledgers/:id','direct',['getLedgers'],
    'Filter RPC getLedgers by ledger sequence, checking that the ledger remains in the provider history window.',[recent,commonLimit]),
  rule('horizon.http.transaction-submit','Transaction submission','http-call','http.POST./transactions','direct',['sendTransaction'],
    'Review sendTransaction submission semantics and track final transaction status as needed; do not assume identical response or status lifecycle.',[commonLimit,'Submitting is distinct from observing final inclusion or success.']),
  rule('horizon.http.transaction-by-hash','Transaction lookup by hash','http-call','http.GET./transactions/:id','direct',['getTransaction'],
    'Query getTransaction by hash for retained history; handle unavailable or not-yet-indexed transaction outcomes.',[recent,commonLimit]),
  rule('horizon.http.account-detail','Account ledger entry','http-call','http.GET./accounts/:id','conditional',['getLedgerEntries'],
    'Use getLedgerEntries for the account ledger entry, and separately derive its trustlines and other Horizon-composed fields.',[commonLimit,'RPC account entry excludes trustline data that Horizon joins.']),
  rule('horizon.http.account-list','Account enumeration','http-call','http.GET./accounts','indexer-required',[],
    'Build or use a historical account index; the RPC API has no direct account-list equivalent.',[recent,'RPC does not maintain Horizon account-list indexes.'],'high'),
  rule('horizon.http.operation-list','Operation history listing','http-call','http.GET./operations','indexer-required',['getTransactions'],
    'Ingest transactions/ledgers and decode XDR to build a searchable operations view, especially for history.',[recent,'getTransactions is not an operations-list drop-in.'],'high'),
  rule('horizon.http.operation-by-id','Operation by Horizon ID','http-call','http.GET./operations/:id','no-direct-rpc-equivalent',[],
    'Keep an indexed mapping from Horizon operation IDs to ledger/transaction positions and retrieve/decode the relevant transaction.',[recent,'RPC does not directly look up a Horizon operation ID.'],'high'),
  rule('horizon.http.payments-list','Payment history','http-call','http.GET./payments','conditional',['getEvents','getTransactions'],
    'Review CAP-67 asset event coverage and transaction meta XDR; index history when needed.',[recent,events,commonLimit],'high'),
  rule('horizon.http.effects-list','Effect history','http-call','http.GET./effects','conditional',['getEvents','getTransactions'],
    'Combine supported classic events with transaction meta XDR and indexing for other Horizon effect types.',[recent,events,commonLimit],'high'),
  rule('horizon.http.transactions-list','Transaction history','http-call','http.GET./transactions','conditional',['getTransactions'],
    'Use getTransactions for the retained history range; ingest or index ledgers for longer-lived search and pagination.',[recent,commonLimit]),
  rule('horizon.http.fee-stats','Fee statistics','http-call','http.GET./fee_stats','conditional',['getFeeStats','simulateTransaction'],
    'Review getFeeStats and simulateTransaction against the application fee estimation use case and expected fields.',[commonLimit]),
  rule('horizon.http.claimable-balances','Claimable balance listing','http-call','http.GET./claimable_balances','indexer-required',[],
    'Maintain a historical claimable-balance index; there is no direct RPC list equivalent.',[recent,'An individual claimable balance has a different lookup path via getLedgerEntries.'],'high'),
  rule('horizon.http.offers','Offers listing','http-call','http.GET./offers','indexer-required',[],
    'Ingest ledger history to build an offers index; RPC does not provide the full Horizon offers list.',[recent],'high'),
  rule('horizon.sdk.account-query','SDK accounts builder','sdk-call','sdk.Horizon.Server.accounts','unknown',[],
    'Inspect subsequent account filters or call builders before choosing account lookup versus list/indexing migration.',[noAuto,'The detected SDK builder method does not reveal a final requested endpoint.'],'medium','unknown'),
  rule('horizon.sdk.payments','SDK payments builder','sdk-call','sdk.Horizon.Server.payments','conditional',['getEvents','getTransactions'],
    'Inspect payment history filters; event coverage and transaction meta XDR may be necessary.',[events,recent,noAuto],'high','medium'),
  rule('horizon.sdk.operations','SDK operations builder','sdk-call','sdk.Horizon.Server.operations','conditional',['getTransactions'],
    'Decode transaction XDR for operations; check whether historical indexing or ID mapping is required.',[recent,noAuto],'high','medium'),
  rule('horizon.sdk.effects','SDK effects builder','sdk-call','sdk.Horizon.Server.effects','conditional',['getEvents','getTransactions'],
    'Review the effect types and reconstruct unavailable effects from transaction meta XDR.',[events,recent,noAuto],'high','medium'),
  rule('horizon.sdk.transactions','SDK transactions builder','sdk-call','sdk.Horizon.Server.transactions','conditional',['getTransactions'],
    'Review filters and historic retention, and use an indexer where RPC history cannot fulfill the query.',[recent,noAuto],'medium','medium'),
  rule('horizon.sdk.load-account','SDK loadAccount','sdk-call','sdk.Horizon.Server.loadAccount','conditional',['getLedgerEntries'],
    'Derive account data from getLedgerEntries and separately resolve trustlines used by the application.',[commonLimit,'Horizon loadAccount response fields are not returned one-to-one by RPC.']),
  rule('horizon.sdk.submit-transaction','SDK submitTransaction','sdk-call','sdk.Horizon.Server.submitTransaction','direct',['sendTransaction'],
    'Review sendTransaction arguments, submission response and finalization/status polling.',[commonLimit,'Do not assume transaction status lifecycle parity.']),
  rule('horizon.sdk.fee-stats','SDK feeStats','sdk-call','sdk.Horizon.Server.feeStats','conditional',['getFeeStats','simulateTransaction'],
    'Choose a fee estimation strategy and check returned fee-stat field differences.',[commonLimit]),
  rule('horizon.sdk.streaming','Horizon streaming','stream','sdk.Horizon.stream','conditional',[],
    'Design RPC polling or an ingestion/stream-processing strategy; Horizon SSE is not an RPC method.',[recent,noAuto,'No direct RPC server-sent-events drop-in exists.'],'high'),
  rule('horizon.http.hal-records','HAL pagination/records','response-shape','http.HAL._embedded.records','conditional',[],
    'Replace Horizon HAL collection traversal with explicit RPC result parsing and application-specific pagination.',[commonLimit,'Requires verified source-to-response provenance, not merely a property name.']),
  rule('horizon.sdk.records','SDK response records','response-shape','sdk.Horizon.records','conditional',[],
    'Review SDK call-builder response records and rebuild response traversal for the selected RPC methods.',[commonLimit,noAuto]),
];
const ALLOWED_KINDS:ReadonlySet<HorizonKind> = new Set(['sdk-client','sdk-call','http-call','stream','response-shape']);
const ALLOWED_MAPPING:ReadonlySet<MappingKind> = new Set(['direct','conditional','indexer-required','no-direct-rpc-equivalent','unknown']);
const ALLOWED_SEVERITY:ReadonlySet<Severity> = new Set(['info','low','medium','high']);
const ALLOWED_CONFIDENCE:ReadonlySet<Confidence> = new Set(['high','medium','unknown']);
const ALLOWED_METHODS = new Set(['getLedgers','getTransactions','getTransaction','getEvents','getLedgerEntries','getFeeStats','simulateTransaction','sendTransaction','getLatestLedger','getVersionInfo','getHealth','getNetwork']);
const SAFE_PATTERN = /^(?:sdk\.Horizon\.(?:Server(?:\.[a-zA-Z]+)?|stream|records)|http\.(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|UNKNOWN)\.\/(?:[a-z_]+|:id|:part)(?:\/(?:[a-z_]+|:id|:part)){0,4}|http\.HAL\._embedded\.records)$/;
const SAFE_ID = /^horizon\.[a-z][a-z0-9.-]{2,79}$/;
const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PII_BAN = /(?:token=|password=|authorization:|\bsecret\b\s*[=:])/i;
const ORDER = (a:string,b:string):number=>a<b?-1:a>b?1:0;

/** Validate untrusted/catalog edits. Error messages intentionally do not echo raw data. */
export function validateRuleCatalog(value:unknown):string[] {
  const errors:string[]=[];
  if(!Array.isArray(value)||!value.length||value.length>300)return ['INVALID_CATALOG'];
  const ids=new Set<string>(), targets=new Set<string>();
  for(let i=0;i<value.length;i++){
    const r=value[i] as Record<string,unknown>|null;
    const fail=(code:string):void=>{errors.push(`${code}:${i}`)};
    if(!r||typeof r!=='object'||Array.isArray(r)){fail('INVALID_RULE');continue;}
    const strings=['id','version','name','detectionKind','matchTarget','mappingKind','severity','confidence','recommendation'];
    if(strings.some(k=>typeof r[k]!=='string')){fail('INVALID_FIELDS');continue;}
    if(!SAFE_ID.test(r.id as string)){fail('INVALID_ID');}
    if(ids.has(r.id as string))fail('DUPLICATE_ID');ids.add(r.id as string);
    if(!/^\d+\.\d+\.\d+$/.test(r.version as string))fail('INVALID_VERSION');
    if(!ALLOWED_KINDS.has(r.detectionKind as HorizonKind))fail('INVALID_DETECTION_KIND');
    if(!SAFE_PATTERN.test(r.matchTarget as string)|| (r.detectionKind==='http-call'&&!String(r.matchTarget).startsWith('http.'))||
      (r.detectionKind==='sdk-call'&&!String(r.matchTarget).startsWith('sdk.Horizon.Server.'))||
      (r.detectionKind==='sdk-client'&&r.matchTarget!=='sdk.Horizon.Server')||
      (r.detectionKind==='stream'&&r.matchTarget!=='sdk.Horizon.stream')||
      (r.detectionKind==='response-shape'&&!['http.HAL._embedded.records','sdk.Horizon.records'].includes(r.matchTarget as string)))fail('INVALID_PATTERN');
    const key=`${r.detectionKind}:${r.matchTarget}`;if(targets.has(key))fail('DUPLICATE_PATTERN');targets.add(key);
    if(!ALLOWED_MAPPING.has(r.mappingKind as MappingKind))fail('INVALID_MAPPING');
    if(!ALLOWED_SEVERITY.has(r.severity as Severity)||!ALLOWED_CONFIDENCE.has(r.confidence as Confidence))fail('INVALID_TRIAGE');
    if(typeof r.name!=='string'||r.name.length<3||r.name.length>150||typeof r.recommendation!=='string'||r.recommendation.length<20||r.recommendation.length>750||PII_BAN.test(r.recommendation))fail('INVALID_DESCRIPTION');
    if(!Array.isArray(r.rpcMethods)||r.rpcMethods.length>8||!r.rpcMethods.every((m:unknown)=>typeof m==='string'&&ALLOWED_METHODS.has(m)))fail('INVALID_RPC_METHODS');
    if(r.mappingKind==='direct'&&(!Array.isArray(r.rpcMethods)||r.rpcMethods.length===0))fail('MISSING_DIRECT_METHOD');
    if((r.mappingKind==='no-direct-rpc-equivalent'||r.mappingKind==='unknown'||r.mappingKind==='indexer-required')&&Array.isArray(r.rpcMethods)&&r.rpcMethods.length>0&&r.mappingKind!=='indexer-required')fail('MISLEADING_MAPPING');
    if(!Array.isArray(r.limitations)||r.limitations.length<1||r.limitations.length>12||!r.limitations.every((v:unknown)=>typeof v==='string'&&v.length>=15&&v.length<=600&&!PII_BAN.test(v)))fail('INVALID_LIMITATIONS');
    if(!Array.isArray(r.officialSources)||r.officialSources.length<1||r.officialSources.length>6||!r.officialSources.every((s:unknown)=>{
      if(!s||typeof s!=='object'||Array.isArray(s))return false;
      const ref=s as Record<string,unknown>;
      return typeof ref.url==='string'&&[GUIDE,RPC,'https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getEvents'].includes(ref.url)&&
        typeof ref.checkedDate==='string'&&VALID_DATE.test(ref.checkedDate)&&!Number.isNaN(Date.parse(ref.checkedDate))&&typeof ref.note==='string'&&ref.note.length>=20&&ref.note.length<=400;
    }))fail('INVALID_SOURCES');
  }
  return errors;
}
const validation=validateRuleCatalog(DEFINITIONS);
if(validation.length)throw new Error('Invalid built-in migration catalog: '+validation.join(','));
const freezeRule=(r:MigrationRule):MigrationRule=>Object.freeze({ ...r,rpcMethods:Object.freeze([...r.rpcMethods]),limitations:Object.freeze([...r.limitations]),officialSources:Object.freeze(r.officialSources.map(s=>Object.freeze({...s}))) });
export const RULES:readonly MigrationRule[]=Object.freeze(DEFINITIONS.map(freezeRule));
const index=new Map(RULES.map(r=>[`${r.detectionKind}:${r.matchTarget}`,r]));
const fallback=freezeRule(rule('horizon.unmapped-pattern','Unmapped detected Horizon use','sdk-client','sdk.Horizon.Server','unknown',[],
  'Review this detected Horizon dependency manually. No reviewed migration rule covers its normalized detector pattern.',[noAuto,commonLimit],'medium','unknown'));

function validateEvidence(f:HorizonFinding):void {
  if(!f||!ALLOWED_KINDS.has(f.kind)||typeof f.pattern!=='string'||!SAFE_PATTERN.test(f.pattern)||!f.location||
    typeof f.location.file!=='string'||f.location.file.length>1024||f.location.file.startsWith('/')||f.location.file.includes('\\')||
    f.location.file.split('/').some(x=>!x||x==='.'||x==='..'||/[\x00-\x1f\x7f]/.test(x))||
    ![f.location.start?.line,f.location.start?.column,f.location.end?.line,f.location.end?.column].every(n=>Number.isSafeInteger(n)&&n>0)||
    f.location.end.line<f.location.start.line||(f.location.end.line===f.location.start.line&&f.location.end.column<f.location.start.column)){
    throw new TypeError('Invalid normalized Horizon detector evidence');
  }
}
/** Exact matcher: never wildcard a potential endpoint into a stronger mapping. */
export function classifyHorizonFindings(findings:readonly HorizonFinding[]):ClassifiedFinding[]{
  if(!Array.isArray(findings)||findings.length>20000)throw new TypeError('Invalid finding collection');
  const output=findings.map(f=>{
    validateEvidence(f);
    const r=index.get(`${f.kind}:${f.pattern}`)??fallback;
    return {ruleId:r.id,ruleVersion:r.version,ruleSetVersion:RULE_SET_VERSION,detectionKind:f.kind,
      detectorPattern:f.pattern,location:f.location,mappingKind:r.mappingKind,rpcMethods:r.rpcMethods,
      severity:r.severity,confidence:r.confidence,recommendation:r.recommendation,
      officialSources:r.officialSources,limitations:r.limitations};
  });
  output.sort((a,b)=>ORDER(a.location.file,b.location.file)||a.location.start.line-b.location.start.line||
    a.location.start.column-b.location.start.column||ORDER(a.ruleId,b.ruleId)||ORDER(a.detectorPattern,b.detectorPattern));
  return output;
}
/** Carry incomplete detector status and unknowns forward; never silently discard uncertainty. */
export function classifyHorizonDetection(detection:HorizonDetection):ClassificationResult{
  if(!detection||!['complete','incomplete'].includes(detection.status)||!Array.isArray(detection.unknowns)||!Array.isArray(detection.diagnostics))throw new TypeError('Invalid Horizon detection');
  return {status:detection.status,findings:classifyHorizonFindings(detection.findings),unknowns:detection.unknowns,diagnostics:detection.diagnostics};
}
