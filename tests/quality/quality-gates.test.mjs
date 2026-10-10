import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validateText,checkFormat} from '../../scripts/check-format.mjs';
import {lintText} from '../../scripts/check-lint.mjs';
import {validateWorkflow,validatePackageLock} from '../../scripts/check-security.mjs';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const workflow=readFileSync(join(root,'.github/workflows/foundation.yml'),'utf8');
const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
const lock=JSON.parse(readFileSync(join(root,'package-lock.json'),'utf8'));
function fixture(fn){const d=mkdtempSync(join(tmpdir(),'horisift-quality-'));try{return fn(d);}finally{rmSync(d,{force:true,recursive:true});}}

test('valid source, workflow and lock pass all local policy validators',()=>{
 assert.deepEqual(validateText('const a=1;\n','x.ts'),[]);
 assert.deepEqual(lintText('export const a=1;\n'),[]);
 assert.deepEqual(validateWorkflow(workflow),[]);
 assert.deepEqual(validatePackageLock(pkg,lock),[]);
});
for(const [name,source,code] of [
 ['CRLF','const a=1;\r\n','CRLF'],
 ['trailing spaces','const a=1; \n','TRAILING_WHITESPACE'],
 ['tabs','\tconst x=1;\n','TAB'],
 ['missing final newline','const a=1;','MISSING_FINAL_LF'],
 ['bad JSON','{"a":}\n','INVALID_JSON'],
 ['BOM','\ufeffok\n','BOM'],
])test('format gate blocks deliberately malformed '+name,()=>assert.ok(validateText(source,name==='bad JSON'?'fixture.json':'fixture.ts').includes(code)));
test('format gate reads actual file and rejects corrupted input',()=>fixture(dir=>{
 writeFileSync(join(dir,'corrupt.ts'),'const a=1;  \n');
 assert.deepEqual(checkFormat(dir,['corrupt.ts']),['corrupt.ts: TRAILING_WHITESPACE']);
}));
for(const [name,code] of [
 ['unsafe evaluator','eval("x")'],
 ['dynamic import','import("./untrusted.js")'],
 ['untrusted child process','import {spawn} from "node:child_process"'],
 ['network import','import {get} from "node:https"'],
 ['dynamic require','require("x")'],
 ['remote fetch','fetch("https://example.com")'],
 ['suppressed type checking','// @ts-ignore\nconst n = "x"'],
 ['function constructor','new Function("return 5")']
])test('lint gate catches deliberate '+name,()=>assert.notEqual(lintText(code,'src/malicious.ts').length,0));
test('workflow gate rejects a mutable action tag',()=>assert.ok(validateWorkflow(workflow.replace('actions/checkout@11d5960a326750d5838078e36cf38b85af677262','actions/checkout@v4')).length));
test('workflow gate rejects expanded permissions',()=>assert.ok(validateWorkflow(workflow.replace('contents: read','contents: write')).includes('PERMISSIONS_NOT_RESTRICTED')));
test('workflow gate rejects dangerous pull request trigger',()=>assert.ok(validateWorkflow(workflow+'\npull_request_target:\n').includes('UNSAFE_WORKFLOW_FEATURE')));
test('workflow gate rejects removed npm audit',()=>assert.ok(validateWorkflow(workflow.replace('npm audit --audit-level=high','echo audit')).includes('NO_DEPENDENCY_AUDIT')));
test('lock validator rejects dependency drift',()=>assert.ok(validatePackageLock({...pkg,dependencies:{...pkg.dependencies,typescript:'9.9.9'}},lock).includes('DEPENDENCY_LOCK_DRIFT')));
test('lock validator rejects fake integrity and external registry',()=>{
 const bad=structuredClone(lock);bad.packages['node_modules/typescript'].integrity='sha1-fake';bad.packages['node_modules/typescript'].resolved='http://untrusted.invalid/file.tgz';
 assert.ok(validatePackageLock(pkg,bad).includes('UNVERIFIED_PACKAGE'));
});
test('actual npm ci refuses a missing lockfile without network',()=>fixture(dir=>{
 const bad={name:'horisift-negative-ci',version:'0.0.0',private:true};
 writeFileSync(join(dir,'package.json'),JSON.stringify(bad));
 const r=spawnSync('npm',['ci','--offline','--ignore-scripts','--no-audit','--no-fund'],{cwd:dir,encoding:'utf8',shell:process.platform==='win32',timeout:12000});
 assert.notEqual(r.status,0,'npm ci must not accept drifted lock');
 assert.match(r.stderr,/npm ci|lock|package.json|EUSAGE/i);
}));
test('actual TypeScript compiler rejects an intentionally broken type',()=>fixture(dir=>{
 const input=join(dir,'invalid.ts');writeFileSync(input,'const count: number = "not a number";\n');
 writeFileSync(join(dir,'tsconfig.json'),JSON.stringify({compilerOptions:{noEmit:true,strict:true,skipLibCheck:true,types:[]},files:['invalid.ts']}));
 const compiler=join(root,'node_modules','typescript','bin','tsc');
 const r=spawnSync(process.execPath,[compiler,'--project',dir],{cwd:root,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
 assert.notEqual(r.status,0);
 assert.match(r.stdout+r.stderr,/TS2322/);
}));
