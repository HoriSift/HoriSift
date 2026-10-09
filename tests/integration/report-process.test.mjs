import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const bin=resolve(fileURLToPath(new URL('../../bin/horisift.mjs',import.meta.url)));
const snapshot=(file)=>readFileSync(fileURLToPath(new URL(`../golden/${file}`,import.meta.url)),'utf8');
const exec=(args)=>spawnSync(process.execPath,[bin,...args],{encoding:'utf8',shell:false,timeout:18000,maxBuffer:20*1024*1024});
const examples={
 complete:"import {Horizon} from '@stellar/stellar-sdk';\nconst client = new Horizon.Server('https://horizon.stellar.org');\nclient.accounts().call();\nfetch('https://horizon.stellar.org/accounts');\n",
 incomplete:"fetch('https://horizon.stellar.org/accounts');\nfetch(`https://horizon.stellar.org/${segment}`);\n"
};
const fixture=(name,fn)=>{const tmp=mkdtempSync(join(tmpdir(),'horisift-report-'));try{mkdirSync(join(tmp,'src'));writeFileSync(join(tmp,'src','café-🚀.ts'),examples[name]);return fn(tmp);}finally{rmSync(tmp,{recursive:true,force:true})}};
for(const kind of ['complete','incomplete']){
 for(const format of ['json','text']){
  test(`${kind} ${format} real CLI bytes match committed snapshot`,()=>fixture(kind,root=>{
   const r=exec(['scan',root,'--format',format]);assert.equal(r.status,kind==='complete'?0:4,r.stderr);
   assert.equal(r.stdout,snapshot(`scan-${kind}.${format==='json'?'json':'txt'}`));
  }));
 }
}
for(const format of ['json','text']){
 test(`rules ${format} process matches committed snapshot`,()=>{
  const r=exec(['rules','--format',format]);assert.equal(r.status,0,r.stderr);
  assert.equal(r.stdout,snapshot(`rules.${format==='json'?'json':'txt'}`));
 });
}
test('CLI output snapshots identical in two roots with different absolute names',()=>fixture('complete',a=>fixture('complete',b=>{
 const x=exec(['scan',a,'--format','json']),y=exec(['scan',b,'--format','json']);assert.equal(x.status,0);assert.equal(y.status,0);assert.equal(x.stdout,y.stdout);
 assert.ok(!x.stdout.includes(a));assert.ok(!y.stdout.includes(b));
})));
test('secret strings inside a scanned source never appear in report or stderr',()=>{
 const dir=mkdtempSync(join(tmpdir(),'horisift-report-secret-'));
 try{writeFileSync(join(dir,'app.ts'),"const apiKey = 'sk_live_TOP_SECRET_123';\nfetch('https://horizon.stellar.org/accounts?token=TOP_SECRET');");
  const r=exec(['scan',dir,'--format','json']);assert.equal(r.status,0,r.stderr);
  assert.doesNotMatch(r.stdout+r.stderr,/TOP_SECRET|sk_live|token=/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('--severity filters only text, JSON snapshot unaffected',()=>fixture('complete',root=>{
 const base=exec(['scan',root,'--format','json']);const filtered=exec(['scan',root,'--format','json','--severity','high']);
 assert.equal(filtered.status,0);assert.equal(filtered.stdout,base.stdout);
}));
test('--allow-incomplete cannot erase status or warnings in JSON',()=>fixture('incomplete',root=>{
 const x=exec(['scan',root,'--format','json','--allow-incomplete']);assert.equal(x.status,0,x.stderr);
 assert.equal(JSON.parse(x.stdout).status,'incomplete');assert.equal(JSON.parse(x.stdout).triage,'incomplete');
}));
test('snapshot text never promises safe migration',()=>{
 for(const s of ['scan-complete.txt','scan-incomplete.txt'])assert.match(snapshot(s),/NOT proof of migration readiness/);
});
