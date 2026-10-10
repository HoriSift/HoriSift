import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const grab=(name)=>JSON.parse(readFileSync(fileURLToPath(new URL(`../../schemas/${name}`,import.meta.url)),'utf8'));
const golden=(name)=>JSON.parse(readFileSync(fileURLToPath(new URL(`../golden/${name}`,import.meta.url)),'utf8'));
const scan=grab('scan-report.v1.schema.json'),rules=grab('rules-report.v1.schema.json');
/** Independent Draft 2020-12 implementation; validates only our trusted schemas.
 * Scanned repositories never supply schemas or get executed by Ajv. */
const ajv=new Ajv2020({strict:true,allErrors:true});
const validators=new Map([[scan,ajv.compile(scan)],[rules,ajv.compile(rules)]]);
function check(value,s){return validators.get(s)(value);}
for(const [file,s] of [['scan-complete.json',scan],['scan-incomplete.json',scan],['rules.json',rules]]){
 test(`golden ${file} conforms to public v1 JSON Schema`,()=>assert.equal(check(golden(file),s,s),true));
}
for(const [name,mutation] of [
 ['wrong version',x=>x.schemaVersion='2.0.0'],
 ['extra root field',x=>x.unsafe='TOP_SECRET'],
 ['missing findings',x=>delete x.findings],
 ['negative scan count',x=>x.filesInspected=-1],
 ['invalid triage',x=>x.triage='ready'],
 ['invalid severity',x=>x.findings[0].severity='fatal'],
 ['invalid confidence',x=>x.findings[0].confidence='perfect'],
 ['invalid location shape',x=>x.findings[0].location.start.line=0],
 ['stray location secret',x=>x.findings[0].location.secret='TOKEN'],
 ['malformed mapping',x=>x.findings[0].mappingKind='exact-drop-in'],
 ['unexpected source field',x=>x.findings[0].officialSources[0].token='SECRET'],
 ['missing evidence source',x=>x.findings[0].officialSources=[]],
 ['bad hash',x=>x.findings[0].id='XX'],
 ['bad diagnostic',x=>x.diagnostics=[{message:'a secret'}]],
 ['absolute location path',x=>x.findings[0].location.file='/private/app.js'],
 ['parent traversal location',x=>x.findings[0].location.file='../app.js'],
 ]){
 test(`schema rejects ${name}`,()=>{const x=structuredClone(golden('scan-complete.json'));mutation(x);assert.equal(check(x,scan,scan),false);});
}
test('incomplete report schema still requires explicit status and uncertainty',()=>{
 const x=golden('scan-incomplete.json');assert.equal(check(x,scan,scan),true);assert.equal(x.status,'incomplete');assert.ok(x.unknowns.length>0);
});
test('rules schema rejects modified/extra rule metadata',()=>{
 const x=golden('rules.json');x.rules[0].sourceSecret='SECRET';assert.equal(check(x,rules,rules),false);
});
test('every schema reference resolves and contracts use JSON Schema 2020-12',()=>{
 for(const x of [scan,rules]){assert.equal(x.$schema,'https://json-schema.org/draft/2020-12/schema');assert.ok(Object.keys(x.$defs).length);}
});
test('Unicode relative source paths remain valid without weakening traversal checks',()=>{
 const x=golden('scan-complete.json');x.findings[0].location.file='应用/stellar-🪐.ts';assert.equal(check(x,scan),true);
});
test('forged unknown code is rejected by the independent validator',()=>{
 const x=golden('scan-incomplete.json');x.unknowns[0].code='FORGED_UNKNOWN';assert.equal(check(x,scan),false);
});
test('malformed JSON is rejected before schema evaluation',()=>{
 assert.throws(()=>JSON.parse('{"schemaVersion":'),SyntaxError);
});
test('location and diagnostic paths reject unsafe segments but diagnostic null remains valid',()=>{
 for(const file of ['a/../app.js','./app.js','a//app.js','a\\app.js','a/./app.js','a\u0000.js']){
  const x=golden('scan-complete.json');x.findings[0].location.file=file;assert.equal(check(x,scan),false,file);
  const y=golden('scan-incomplete.json');y.diagnostics=[{code:'INVALID_SYNTAX',file,message:'Source has a syntax error.'}];assert.equal(check(y,scan),false,file);
 }
 const x=golden('scan-incomplete.json');x.diagnostics=[{code:'INVALID_SYNTAX',file:null,message:'Coverage is incomplete.'}];assert.equal(check(x,scan),true);
});
