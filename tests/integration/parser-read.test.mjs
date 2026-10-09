import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readSourceFile } from '../../src/parser/read.ts';
import { parseSource } from '../../src/parser/parse.ts';
import { discoverSourceFiles } from '../../src/scanner/discover.ts';
async function fixture(fn) {
  const tmp=await mkdtemp(join(tmpdir(),'horisift-parser-'));
  try {return await fn(tmp)} finally {await rm(tmp,{recursive:true,force:true})}
}
test('discovery -> safe read -> syntax facts no source execution',()=>fixture(async root=>{
  await mkdir(join(root,'src'));
  await writeFile(join(root,'src','wallet.ts'),"import { Horizon } from '@stellar/stellar-sdk';\nconst unused = 1;\n");
  const discovery=await discoverSourceFiles(root);assert.equal(discovery.status,'complete');assert.deepEqual(discovery.files.map(x=>x.path),['src/wallet.ts']);
  const raw=await readSourceFile(root,discovery.files[0].path);
  assert.equal(raw.status,'ok');const ast=parseSource(raw.path,raw.source);
  assert.equal(ast.status,'complete');assert.equal(ast.imports[0].localName,'Horizon');
}));
test('does not execute arbitrary source code',()=>fixture(async root=>{
  await writeFile(join(root,'malicious.js'),"throw new Error('would execute');\nprocess.exit(111)");
  const raw=await readSourceFile(root,'malicious.js');assert.equal(raw.status,'ok');
  assert.equal(parseSource(raw.path,raw.source).status,'complete');
}));
test('refuses traversal and backslash paths',()=>fixture(async root=>{
  for(const path of ['../private.js','x/../../private.js','/etc/passwd','folder\\file.js','x//y.js']){
    const x=await readSourceFile(root,path);assert.equal(x.status,'incomplete');assert.equal(x.diagnostic.code,'INVALID_PATH');
  }
}));
test('rejects symlink to outside and symlink path component',()=>fixture(async root=>{
  const outside=await mkdtemp(join(tmpdir(),'horisift-outside-'));
  try {
    await writeFile(join(outside,'secret.ts'),'const secret=123');
    await mkdir(join(root,'src'));
    await symlink(join(outside,'secret.ts'),join(root,'src','linked.ts'),'file');
    await symlink(outside,join(root,'dir'),'dir');
    for(const path of ['src/linked.ts','dir/secret.ts']) {
      const r=await readSourceFile(root,path);assert.equal(r.status,'incomplete');assert.equal(r.diagnostic.code,'SYMLINK_SKIPPED');
    }
  } finally {await rm(outside,{recursive:true,force:true})}
}));
test('rejects symlink root',()=>fixture(async root=>{
  const alias=root+'-link';await symlink(root,alias,'dir');
  try {const r=await readSourceFile(alias,'a.ts');assert.equal(r.diagnostic.code,'INVALID_ROOT')} finally {await rm(alias,{force:true})}
}));
test('missing source and invalid root become structured diagnostics',()=>fixture(async root=>{
  const a=await readSourceFile(root,'missing.ts');assert.equal(a.diagnostic.code,'FILE_UNREADABLE');
  const b=await readSourceFile(join(root,'missing'),'missing.ts');assert.equal(b.diagnostic.code,'INVALID_ROOT');
}));
test('bounds bytes and handles exact-byte boundary and growing file',()=>fixture(async root=>{
  await writeFile(join(root,'a.ts'),'0123456789');
  assert.equal((await readSourceFile(root,'a.ts',{maxFileBytes:9})).diagnostic.code,'FILE_TOO_LARGE');
  const r=await readSourceFile(root,'a.ts',{maxFileBytes:10});assert.equal(r.status,'ok');assert.equal(r.sizeBytes,10);
}));
test('rejects invalid UTF-8 and NUL bytes without emitting data',()=>fixture(async root=>{
  await writeFile(join(root,'binary.ts'),Buffer.from([0x66,0xff,0x61]));
  await writeFile(join(root,'null.ts'),Buffer.from([0x61,0,0x62]));
  for(const p of ['binary.ts','null.ts']) {
    const r=await readSourceFile(root,p);assert.equal(r.diagnostic.code,'INVALID_ENCODING'); assert.ok(!('source' in r));
  }
}));
test('strips UTF-8 BOM and parses source',()=>fixture(async root=>{
  await writeFile(join(root,'bom.ts'),'\uFEFFimport { Horizon } from "stellar-sdk";');
  const r=await readSourceFile(root,'bom.ts');assert.equal(r.status,'ok');assert.ok(r.source.startsWith('import'));assert.equal(parseSource(r.path,r.source).imports.length,1);
}));
test('read-time revalidation catches file mutated to symbolic link',()=>fixture(async root=>{
  await writeFile(join(root,'gone.ts'),'const a=1');
  const first=await discoverSourceFiles(root);assert.equal(first.status,'complete');
  await rm(join(root,'gone.ts'));await symlink(join(root,'other.ts'),join(root,'gone.ts'),'file');
  const r=await readSourceFile(root,first.files[0].path);assert.equal(r.diagnostic.code,'SYMLINK_SKIPPED');
}));
test('simulated unreadable file returns sanitized diagnostic',()=>fixture(async root=>{
  await writeFile(join(root,'secret.ts'),'token=TOP_SECRET');
  const io={open:async()=>{throw new Error('TOP_SECRET /home/user/private')}};
  const r=await readSourceFile(root,'secret.ts',{io});assert.equal(r.diagnostic.code,'FILE_UNREADABLE'); assert.ok(!JSON.stringify(r).includes('TOP_SECRET'));
}));
test('invalid config rejects negative, noninteger, oversized allocations',()=>fixture(async root=>{
  for(const n of [-1,0,1.5,Infinity,64*1024*1024+1])await assert.rejects(()=>readSourceFile(root,'x.ts',{maxFileBytes:n}),TypeError);
}));
