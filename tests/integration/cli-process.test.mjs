import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const executable=resolve(fileURLToPath(new URL('../../bin/horisift.mjs',import.meta.url)));
const processCli=(args)=>spawnSync(process.execPath,[executable,...args],{encoding:'utf8',shell:false,timeout:20000,maxBuffer:10*1024*1024});
function fixture(fn){const root=mkdtempSync(join(tmpdir(),'horisift-cli-'));try{return fn(root)}finally{rmSync(root,{force:true,recursive:true});}}
test('executable help and version work without network or target code',()=>{
 const a=processCli(['--help']);assert.equal(a.status,0);assert.match(a.stdout,/scan <path>/);assert.equal(a.error,undefined);
 const b=processCli(['--version']);assert.equal(b.status,0);assert.equal(b.stdout.trim(),'0.1.0-rc.1');
});
test('real scan with supported Horizon usage exits according to --fail-on',()=>fixture(root=>{
 writeFileSync(join(root,'app.ts'),"import {Horizon} from '@stellar/stellar-sdk';\nconst c=new Horizon.Server('https://horizon.stellar.org');\nc.payments().call();");
 const a=processCli(['scan',root,'--format','json']);assert.equal(a.status,0,a.stderr);const obj=JSON.parse(a.stdout);assert.equal(obj.status,'complete');assert.ok(obj.findings.length>0);assert.equal(obj.root,'.');assert.equal(a.stdout.includes(root),false);assert.equal(a.stdout.includes('horizon.stellar.org'),false);
 const b=processCli(['scan',root,'--fail-on','info']);assert.equal(b.status,1,b.stderr);
}));
test('threshold is independent of presentation severity',()=>fixture(root=>{
 writeFileSync(join(root,'app.ts'),"fetch('https://horizon.stellar.org/ledgers');");
 const a=processCli(['scan',root,'--severity','high','--fail-on','info']);assert.equal(a.status,1,a.stderr);assert.match(a.stdout,/Findings:/);
}));
test('empty repository reports incomplete exit 4; allow preserves incomplete',()=>fixture(root=>{
 const a=processCli(['scan',root,'--format','json']);assert.equal(a.status,4,a.stderr);assert.equal(JSON.parse(a.stdout).status,'incomplete');
 const b=processCli(['scan',root,'--allow-incomplete','--format','json']);assert.equal(b.status,0,b.stderr);assert.equal(JSON.parse(b.stdout).triage,'incomplete');
}));
test('legacy named and destructured Server imports propagate incomplete to CLI',()=>fixture(root=>{
 writeFileSync(join(root,'named.ts'),"import {Server as Old} from 'stellar-sdk'; new Old('https://horizon.stellar.org');");
 writeFileSync(join(root,'destructured.js'),"const {Server}=require('stellar-sdk'); new Server('https://horizon.stellar.org');");
 const a=processCli(['scan',root,'--format','json']);assert.equal(a.status,4,a.stderr);
 const report=JSON.parse(a.stdout);assert.equal(report.status,'incomplete');assert.equal(report.unknowns.length,2);assert.equal(report.findings.length,0);
 assert.ok(report.unknowns.every(u=>u.code==='LEGACY_SDK_SERVER'));
 const b=processCli(['scan',root,'--format','json','--allow-incomplete']);assert.equal(b.status,0,b.stderr);assert.equal(b.stdout,a.stdout);
}));
test('unsupported-only repository reports incomplete instead of safe',()=>fixture(root=>{
 writeFileSync(join(root,'README.txt'),'nothing');
 const a=processCli(['scan',root]);assert.equal(a.status,4,a.stderr);assert.match(a.stdout,/incomplete/);
}));
test('syntax error does not crash CLI or lose diagnostic',()=>fixture(root=>{
 writeFileSync(join(root,'bad.ts'),"import {Horizon} from '@stellar/stellar-sdk';\nconst a = (");
 const a=processCli(['scan',root,'--format','json']);assert.equal(a.status,4,a.stderr);assert.ok(JSON.parse(a.stdout).diagnostics.some(x=>x.code==='INVALID_SYNTAX'));
}));
test('source throwing on execution is never executed',()=>fixture(root=>{
 writeFileSync(join(root,'bad.js'),"throw new Error('EXECUTED'); process.exit(55)");
 const a=processCli(['scan',root]);assert.equal(a.status,0,a.stderr);assert.doesNotMatch(a.stdout+a.stderr,/EXECUTED/);
}));
test('missing root and file-as-root fail usage 2',()=>fixture(root=>{
 const a=processCli(['scan',join(root,'missing')]);assert.equal(a.status,2,a.stderr);
 const file=join(root,'a.ts');writeFileSync(file,'const a=1');const b=processCli(['scan',file]);assert.equal(b.status,2,b.stderr);
}));
test('bad CLI arguments yield 2 with sanitized error',()=>{
 const a=processCli(['scan','../../secret','--format','unknown']);assert.equal(a.status,2);assert.equal(a.stdout,'');assert.doesNotMatch(a.stderr,/\.\.\/\.\.\/secret/);
});
test('rules JSON lists exactly catalog, consistent twice',()=>{
 const a=processCli(['rules','--format','json']),b=processCli(['rules','--format','json']);assert.equal(a.status,0,a.stderr);assert.equal(a.stdout,b.stdout);const o=JSON.parse(a.stdout);assert.equal(o.rules.length,25);assert.equal(o.ruleSetVersion,'1.0.0');
});
test('scan outputs are deterministic independent of root absolute path',()=>fixture(a=>fixture(b=>{
 const s="fetch('https://horizon.stellar.org/accounts');";writeFileSync(join(a,'app.js'),s);writeFileSync(join(b,'app.js'),s);
 const x=processCli(['scan',a,'--format','json']),y=processCli(['scan',b,'--format','json']);assert.equal(x.status,0,x.stderr);assert.equal(y.status,0,y.stderr);assert.equal(x.stdout,y.stdout);
})));
test('symlink to external content is never executed and reports incomplete',()=>fixture(root=>fixture(outside=>{
 writeFileSync(join(outside,'secret.js'),"throw new Error('TOP_SECRET')");
 try{symlinkSync(join(outside,'secret.js'),join(root,'link.js'),'file')}catch(e){if(['EPERM','EACCES','ENOTSUP'].includes(e.code))return;throw e;}
 const a=processCli(['scan',root,'--format','json']);assert.equal(a.status,4,a.stderr);assert.equal(JSON.parse(a.stdout).status,'incomplete');assert.doesNotMatch(a.stdout,/TOP_SECRET/);
})));
