import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,mkdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {assessHorizonUsage,assessHorizonRepository} from '../../src/analysis/risk.ts';
import {readSourceFile} from '../../src/parser/read.ts';
import {discoverSourceFiles} from '../../src/scanner/discover.ts';
import {renderScanJson} from '../../src/reports/render.ts';

const temp=async fn=>{const root=await mkdtemp(join(tmpdir(),'horisift-adversarial-'));try{return await fn(root)}finally{await rm(root,{recursive:true,force:true})}};

const invalidPaths=['../escape.ts','../../secret.ts','/etc/passwd.ts','C:\\secret.ts','src//bad.ts','./app.ts','src/../bad.ts','a\u0000b.ts','trailing/',''];
for(const path of invalidPaths){
  test(`rejects unsafe source read path ${JSON.stringify(path)}`,()=>temp(async root=>{
    const output=await readSourceFile(root,path);
    assert.equal(output.status,'incomplete');assert.equal(output.diagnostic.code,'INVALID_PATH');
    assert.equal(output.diagnostic.file,null);
    assert.ok(!JSON.stringify(output).includes(root));
  }));
}
for(const n of [0,1,5,16,255,256,1024]){
 test(`bounded byte read on ${n} byte valid source`,()=>temp(async root=>{
   const value=' '.repeat(n);await writeFile(join(root,'sample.ts'),value);
   const output=await readSourceFile(root,'sample.ts',{maxFileBytes:Math.max(n,1)});
   assert.equal(output.status,'ok');assert.equal(output.sizeBytes,n);
   assert.equal(output.source,value);
 }));
}
for(const n of [1,5,16,256]){
 test(`one-byte-over-limit at ${n} bytes reports safely`,()=>temp(async root=>{
   await writeFile(join(root,'sample.ts'),'x'.repeat(n+1));
   const output=await readSourceFile(root,'sample.ts',{maxFileBytes:n});
   assert.equal(output.status,'incomplete');assert.equal(output.diagnostic.code,'FILE_TOO_LARGE');
   assert.ok(!JSON.stringify(output).includes(root));
 }));
}
for(const sample of [
 {id:'invalid-utf8',buf:Buffer.from([0xc3,0x28]),code:'INVALID_ENCODING'},
 {id:'embedded-null',buf:Buffer.from([0x61,0x00,0x62]),code:'INVALID_ENCODING'},
 {id:'incomplete-utf8',buf:Buffer.from([0xf0,0x9f,0x8c]),code:'INVALID_ENCODING'},
]){
 test(`rejects ${sample.id} with stable code`,()=>temp(async root=>{
   await writeFile(join(root,'unsafe.ts'),sample.buf);
   const out=await readSourceFile(root,'unsafe.ts');assert.equal(out.status,'incomplete');assert.equal(out.diagnostic.code,sample.code);
 }));
}
for(const extension of ['js','jsx','mjs','cjs','ts','tsx','mts','cts']){
 test(`supported source extension .${extension} is discovered`,()=>temp(async root=>{
   const file=`accepted.${extension}`;await writeFile(join(root,file),'// source');
   const found=await discoverSourceFiles(root);
   assert.equal(found.status,'complete');assert.deepEqual(found.files.map(x=>x.path),[file]);
 }));
}
for(const invalid of [
 "import {Horizon} from '@stellar/stellar-sdk';\nconst c = (",
 "fetch('https://horizon.stellar.org/accounts';",
 "const secret = '\\uD800';\nfunction fn() {",
]){
 test('malformed syntax never produces confirmed migration findings',()=>{
   const out=assessHorizonUsage('src/invalid.ts',invalid);
   assert.equal(out.status,'incomplete');assert.equal(out.findings.length,0);
   assert.ok(out.diagnostics.some(d=>d.code==='INVALID_SYNTAX'));
 });
}
for(const fragment of [
 "// fetch('https://horizon.stellar.org/accounts')\n",
 "const example = \"fetch('https://horizon.stellar.org/accounts')\";\n",
 "const Horizon = {Server: function Fake(){this.accounts=()=>({call:()=>null})}};\nnew Horizon.Server().accounts().call();\n",
 "const fake = {get:()=>null};\nfake.get('https://horizon.stellar.org/payments');\n",
 "function fetch(url: string){ return url };\nfetch('https://horizon.stellar.org/accounts');\n"
]){
 test('negative Horizon-looking source cannot manufacture confirmed usage',()=>{
   const output=assessHorizonUsage('src/example.ts',fragment);
   assert.equal(output.status,'complete');assert.equal(output.findings.length,0);
 });
}

test('symlinked directory escapes are rejected without reading outside secrets',()=>temp(root=>temp(async other=>{
  await mkdir(join(root,'src'));await writeFile(join(root,'src','good.ts'),'const ok=1;');
  await writeFile(join(other,'sensitive.ts'),"throw new Error('OUTSIDE_SECRET')");
  try{await symlink(other,join(root,'src','outside'),'dir')}catch(e){if(['EPERM','EACCES','ENOTSUP'].includes(e.code))return;throw e;}
  const risk=await assessHorizonRepository(root);
  assert.equal(risk.status,'incomplete');assert.equal(risk.filesInspected,1);
  const json=renderScanJson(risk,'0.0.0');
  assert.doesNotMatch(json,/OUTSIDE_SECRET/);assert.ok(!json.includes(other));assert.ok(!json.includes(root));
})));

test('late source-read changes cannot leak raw injected filesystem errors',()=>temp(async root=>{
  await writeFile(join(root,'app.ts'),'const x=1;');
  const response=await readSourceFile(root,'app.ts',{io:{open:async()=>({
    stat:async()=>({isFile:()=>true,size:10}),
    read:async()=>{throw new Error('ACCESS_TOKEN_SENSITIVE_SECRET')},
    close:async()=>{}
  })}});
  assert.equal(response.status,'incomplete');assert.equal(response.diagnostic.code,'FILE_UNREADABLE');
  assert.doesNotMatch(JSON.stringify(response),/ACCESS_TOKEN_SENSITIVE_SECRET/);
}));
