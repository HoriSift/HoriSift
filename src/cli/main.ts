/**
 * Offline, conservative CLI integration. No target code execution, installs,
 * networking, telemetry, or generated fixes. Full report renderers are separate.
 */
import { assessHorizonRepository, type RepositoryRiskAssessment } from '../analysis/risk.ts';
import { RULES, type Severity, type MigrationRule } from '../rules/catalog.ts';
import { DiscoveryInputError } from '../scanner/discover.ts';
import { renderScanJson, renderScanText, renderRulesJson, renderRulesText } from '../reports/render.ts';

export const CLI_VERSION = '0.0.0' as const;
export type Format = 'text' | 'json';
export type Command =
  | { kind:'scan'; path:string; format:Format; severity:Severity; failOn:Severity|null; allowIncomplete:boolean }
  | { kind:'rules'; format:Format }
  | { kind:'help'; topic:'main'|'scan'|'rules' }
  | { kind:'version' };
export class CliUsageError extends Error {
  constructor() { super('Invalid command or option. Use horisift --help for usage.'); this.name='CliUsageError'; }
}
export const EXIT = Object.freeze({OK:0, FINDINGS:1, USAGE:2, RUNTIME:3, INCOMPLETE:4});
const SEVERITY:Readonly<Record<Severity,number>>={info:0,low:1,medium:2,high:3};
const LEVELS=new Set<Severity>(['info','low','medium','high']);
const safeArg=(s:unknown):s is string=>typeof s==='string'&&s.length>0&&s.length<=4096&&!/[\x00-\x1f\x7f]/.test(s);
const knownFormat=(s:string):s is Format=>s==='text'||s==='json';
const knownLevel=(s:string):s is Severity=>LEVELS.has(s as Severity);

/** Pure, strict argument parser. Option order is arbitrary, duplicates are rejected. */
export function parseArguments(args:readonly string[]):Command {
  if(!Array.isArray(args)||args.length>32||args.some(a=>!safeArg(a)))throw new CliUsageError();
  if(args.length===0)throw new CliUsageError();
  if(args.length===1&&['--help','-h','help'].includes(args[0]!))return {kind:'help',topic:'main'};
  if(args.length===1&&['--version','-v','version'].includes(args[0]!))return {kind:'version'};
  const [kind,...rest]=args;
  if(kind!=='scan'&&kind!=='rules')throw new CliUsageError();
  if(rest.length===1&&['--help','-h'].includes(rest[0]!))return {kind:'help',topic:kind};
  if(rest.includes('--help')||rest.includes('-h')||rest.includes('--version')||rest.includes('-v'))throw new CliUsageError();
  let format:Format='text',severity:Severity='info',failOn:Severity|null=null,allowIncomplete=false;
  let seenFormat=false,seenSeverity=false,seenFail=false,seenPath=false,optionsEnd=false,path='';
  for(let i=0;i<rest.length;i++){
    const arg=rest[i]!;
    if(arg==='--'&&!optionsEnd){ optionsEnd=true;continue; }
    if(!optionsEnd&&arg==='--allow-incomplete'){
      if(kind!=='scan'||allowIncomplete)throw new CliUsageError(); allowIncomplete=true; continue;
    }
    if(!optionsEnd&&['--format','--severity','--fail-on'].includes(arg)){
      if(arg!=='--format'&&kind!=='scan')throw new CliUsageError();
      const value=rest[++i];if(!value)throw new CliUsageError();
      if(arg==='--format'){if(seenFormat||!knownFormat(value))throw new CliUsageError();format=value;seenFormat=true;}
      else if(arg==='--severity'){if(seenSeverity||!knownLevel(value))throw new CliUsageError();severity=value;seenSeverity=true;}
      else {if(seenFail||!knownLevel(value))throw new CliUsageError();failOn=value;seenFail=true;}
      continue;
    }
    if(!optionsEnd&&arg.startsWith('--')){
      // --format=json / unknown options intentionally fail; one documented grammar.
      throw new CliUsageError();
    }
    if(!optionsEnd&&arg.startsWith('-'))throw new CliUsageError();
    if(kind==='rules'||seenPath)throw new CliUsageError();
    path=arg;seenPath=true;
  }
  if(kind==='rules')return {kind:'rules',format};
  if(!seenPath||path==='--')throw new CliUsageError();
  return {kind:'scan',path,format,severity,failOn,allowIncomplete};
}

export function decideScanExit(report:RepositoryRiskAssessment,failOn:Severity|null,allowIncomplete:boolean):number {
  if(report.status!=='complete'&&report.status!=='incomplete')throw new TypeError('Invalid assessment status');
  if(report.status==='incomplete'&&!allowIncomplete)return EXIT.INCOMPLETE;
  if(failOn!==null&&report.findings.some(f=>SEVERITY[f.severity]>=SEVERITY[failOn]))return EXIT.FINDINGS;
  return EXIT.OK;
}
export const HELP_MAIN=`HoriSift — local-only Horizon migration inspection (development build)\n\nUsage:\n  horisift scan <path> [--format text|json] [--severity info|low|medium|high] [--fail-on info|low|medium|high] [--allow-incomplete]\n  horisift rules [--format text|json]\n  horisift --help\n  horisift --version\n\nA clean result is NOT proof of migration readiness. No networking or source execution.\n`;
export const HELP_SCAN=`Usage: horisift scan <path> [--format text|json] [--severity info|low|medium|high] [--fail-on info|low|medium|high] [--allow-incomplete]\n\n--severity filters text display only; JSON retains all findings.\n--fail-on sets the CI threshold over ALL findings. Without it, findings do not fail CI.\n--allow-incomplete permits status=incomplete but does not erase it from output.\nExit: 0 completed or allowed, 1 threshold, 2 invalid usage/path, 3 fatal runtime, 4 incomplete.\nThis tool does not certify migration readiness.\n`;
export const HELP_RULES=`Usage: horisift rules [--format text|json]\n\nList source-backed migration rules. Mapped RPC methods are candidates, not drop-in replacements.\n`;

export interface CliIO { stdout:(s:string)=>void; stderr:(s:string)=>void; assess:(root:string)=>Promise<RepositoryRiskAssessment>; rules:readonly MigrationRule[] }
/** Integration seam for CLI and failure tests; real executable uses safe repo assessor. */
export async function runCli(args:readonly string[],io:CliIO):Promise<number>{
  let cmd:Command;
  try{cmd=parseArguments(args);}catch{return writeError(io,EXIT.USAGE,'Invalid command or option. Use horisift --help for usage.');}
  if(cmd.kind==='help'){io.stdout(cmd.topic==='scan'?HELP_SCAN:cmd.topic==='rules'?HELP_RULES:HELP_MAIN);return EXIT.OK;}
  if(cmd.kind==='version'){io.stdout(CLI_VERSION+'\n');return EXIT.OK;}
  if(cmd.kind==='rules'){
    io.stdout(cmd.format==='json'?renderRulesJson(io.rules,CLI_VERSION):renderRulesText(io.rules));
    return EXIT.OK;
  }
  try{
    const report=await io.assess(cmd.path);
    const code=decideScanExit(report,cmd.failOn,cmd.allowIncomplete);
    const output=cmd.format==='json'?renderScanJson(report,CLI_VERSION):renderScanText(report,cmd.severity);
    io.stdout(output);
    return code;
  }catch(error){
    // Never print Error.message, stack, scan root or absolute paths from an untrusted tree.
    const usage=error instanceof DiscoveryInputError||error instanceof CliUsageError;
    return writeError(io,usage?EXIT.USAGE:EXIT.RUNTIME,usage?'Invalid or unavailable scan directory.':'Cannot complete scan safely.');
  }
}
function writeError(io:Pick<CliIO,'stderr'>,code:number,message:string):number {io.stderr(message+'\n');return code;}
export async function main(argv:readonly string[]):Promise<number>{
  return runCli(argv,{
    stdout:s=>process.stdout.write(s),stderr:s=>process.stderr.write(s),
    assess:path=>assessHorizonRepository(path),rules:RULES,
  });
}
