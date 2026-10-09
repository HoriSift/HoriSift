import test from 'node:test';
import assert from 'node:assert/strict';
import {parseArguments,decideScanExit,runCli,EXIT,CLI_VERSION,CliUsageError} from '../../src/cli/main.ts';
import {assessHorizonUsage} from '../../src/analysis/risk.ts';
import {RULES} from '../../src/rules/catalog.ts';

const clean=()=>({...assessHorizonUsage('src/a.ts','const value = 5;'),root:'.',filesInspected:1});
const found=()=>({...assessHorizonUsage('src/a.ts',"import {Horizon} from '@stellar/stellar-sdk';\nconst h = new Horizon.Server('https://horizon.stellar.org');\nh.accounts().call();"),root:'.',filesInspected:1});
const incomplete=()=>({...assessHorizonUsage('src/a.ts','const x = ('),root:'.',filesInspected:1});
const fake=(report=clean(),failure=null,rules=RULES)=>{
 const stdout=[],stderr=[];
 const io={stdout:s=>stdout.push(s),stderr:s=>stderr.push(s),assess:async()=>{if(failure)throw failure;return report},rules};
 return {stdout,stderr,io};
};
for(const args of [[],['garbage'],['scan'],['rules','other'],['scan','.','--format'],['scan','.','--format','csv'],['scan','.','--severity','fatal'],['scan','.','--fail-on','xxx'],['scan','.','--allow-incomplete','--allow-incomplete'],['scan','.','--format','text','--format','json'],['rules','--severity','high'],['scan','.', '--json'],['scan','.', '--format=json'],['scan','.','--unknown'],['scan','.','--version'],['scan','.','a.ts'],['scan','../a','--','extra'],['--version','oops'],['scan','x\u0000'],['scan','x\n']]){
 test(`reject invalid CLI arguments ${JSON.stringify(args)}`,()=>assert.throws(()=>parseArguments(args),CliUsageError));
}
test('parses scan defaults and flexible option order',()=>{
 assert.deepEqual(parseArguments(['scan','repo']),{kind:'scan',path:'repo',format:'text',severity:'info',failOn:null,allowIncomplete:false});
 assert.deepEqual(parseArguments(['scan','--fail-on','high','--severity','medium','repo','--format','json','--allow-incomplete']),{kind:'scan',path:'repo',format:'json',severity:'medium',failOn:'high',allowIncomplete:true});
});
test('supports leading-dash path after --',()=>assert.equal(parseArguments(['scan','--','-project']).path,'-project'));
test('help and version commands',()=>{
 assert.deepEqual(parseArguments(['--help']),{kind:'help',topic:'main'});
 assert.deepEqual(parseArguments(['scan','--help']),{kind:'help',topic:'scan'});
 assert.deepEqual(parseArguments(['rules','-h']),{kind:'help',topic:'rules'});
 assert.deepEqual(parseArguments(['-v']),{kind:'version'});
});
test('rules are list-only, no scan path or fail-on',()=>{
 assert.deepEqual(parseArguments(['rules','--format','json']),{kind:'rules',format:'json'});
 assert.throws(()=>parseArguments(['rules','--allow-incomplete']),CliUsageError);
});
test('exit code: successful clean scan 0',()=>assert.equal(decideScanExit(clean(),null,false),EXIT.OK));
test('exit code: known findings need explicit --fail-on',()=>{
 assert.equal(decideScanExit(found(),null,false),EXIT.OK);
 assert.equal(decideScanExit(found(),'info',false),EXIT.FINDINGS);
 assert.equal(decideScanExit(found(),'high',false),EXIT.OK); // Higher thresholds do not trigger for every finding
 const priority={...assessHorizonUsage('src/a.ts', "fetch('https://horizon.stellar.org/accounts');"),root:'.',filesInspected:1};
 assert.equal(decideScanExit(priority,'high',false),EXIT.FINDINGS);
});
test('exit code: incomplete dominates findings even when --fail-on threshold',()=>{
 const mixed={...found(),status:'incomplete'};
 assert.equal(decideScanExit(mixed,'info',false),EXIT.INCOMPLETE);
 assert.equal(decideScanExit(mixed,'info',true),EXIT.FINDINGS);
 assert.equal(decideScanExit(mixed,null,true),EXIT.OK);
});
test('exit code: no supported evidence and incomplete are different',()=>{
 assert.equal(decideScanExit(incomplete(),null,false),EXIT.INCOMPLETE);
 assert.equal(decideScanExit(incomplete(),null,true),EXIT.OK);
});
test('rules JSON is exact versioned metadata, independent of scan',async()=>{
 const s=fake();assert.equal(await runCli(['rules','--format','json'],s.io),EXIT.OK);
 const o=JSON.parse(s.stdout.join(''));assert.equal(o.toolVersion,CLI_VERSION);assert.equal(o.rules.length,25);assert.equal(s.stderr.length,0);
});
test('rules text never claims safe direct migration',async()=>{
 const s=fake();assert.equal(await runCli(['rules'],s.io),EXIT.OK);
 assert.match(s.stdout[0],/advisory/);assert.doesNotMatch(s.stdout[0],/safe to migrate/i);
});
test('scan json preserves all findings even when severity display filtered',async()=>{
 const report=found();assert.ok(report.findings.length>0);
 const a=fake(report),b=fake(report);
 assert.equal(await runCli(['scan','example','--format','json','--severity','high'],a.io),EXIT.OK);
 assert.equal(await runCli(['scan','example','--format','json','--severity','info'],b.io),EXIT.OK);
 assert.equal(a.stdout.join(''),b.stdout.join(''));
 assert.equal(JSON.parse(a.stdout[0]).summary.findings,report.summary.findings);
 assert.equal(JSON.parse(a.stdout[0]).status,report.status);
});
test('scan --severity filters text display, never CI threshold',async()=>{
 const report=found();const s=fake(report);
 assert.equal(await runCli(['scan','path','--severity','high','--fail-on','info'],s.io),EXIT.FINDINGS);
 assert.match(s.stdout[0],/Findings:/);
});
test('all findings still produce 0 if fail-on absent',async()=>{
 const s=fake(found());assert.equal(await runCli(['scan','x'],s.io),EXIT.OK);
 assert.match(s.stdout[0],/NOT proof of migration readiness/);
});
test('incomplete returns 4, allow-incomplete preserves JSON incomplete',async()=>{
 const s=fake(incomplete());assert.equal(await runCli(['scan','x','--format','json'],s.io),EXIT.INCOMPLETE);
 assert.equal(JSON.parse(s.stdout[0]).status,'incomplete');
 const allowed=fake(incomplete());assert.equal(await runCli(['scan','x','--allow-incomplete','--format','json'],allowed.io),EXIT.OK);
 assert.equal(JSON.parse(allowed.stdout[0]).status,'incomplete');
});
test('invalid root usage maps to 2 without exposing root or thrown message',async()=>{
 const s=fake(clean(),new Error('TOP_SECRET /home/user/internal'));
 assert.equal(await runCli(['scan','root'],s.io),EXIT.RUNTIME);
 assert.doesNotMatch(s.stderr.join(''),/TOP_SECRET|home\/user/);
});
test('invalid config/root maps to 2, fatal exception to 3',async()=>{
 const bad=fake(clean(),new (await import('../../src/scanner/discover.ts')).DiscoveryInputError('INVALID_ROOT'));
 assert.equal(await runCli(['scan','nonexistent'],bad.io),EXIT.USAGE);
 assert.equal(await runCli(['scan','x','--format','bad'],bad.io),EXIT.USAGE);
});
test('help prints concise guidance and avoids scanning',async()=>{
 const s=fake(clean(),new Error('should not run'));
 assert.equal(await runCli(['--help'],s.io),EXIT.OK);
 assert.match(s.stdout[0],/Usage:/);
 assert.equal(await runCli(['--version'],s.io),EXIT.OK);
 assert.equal(s.stdout[1],CLI_VERSION+'\n');
});
test('out-of-bounds option lists rejected',()=>assert.throws(()=>parseArguments(Array(33).fill('scan')),CliUsageError));
