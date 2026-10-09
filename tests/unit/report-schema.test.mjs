import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const grab=(name)=>JSON.parse(readFileSync(fileURLToPath(new URL(`../../schemas/${name}`,import.meta.url)),'utf8'));
const golden=(name)=>JSON.parse(readFileSync(fileURLToPath(new URL(`../golden/${name}`,import.meta.url)),'utf8'));
const scan=grab('scan-report.v1.schema.json'),rules=grab('rules-report.v1.schema.json');
/** Small validator for the schema features actually used by our committed Draft 2020-12 contracts.
 * The specs stay vendor-neutral JSON Schema, with no added npm runtime dependency. */
function check(value,s,root){
 if(s.$ref){const fields=s.$ref.split('/');if(fields[0]!=='#')return false;
  let target=root;for(const f of fields.slice(1))target=target?.[f];return !!target&&check(value,target,root);}
 if(Object.hasOwn(s,'const')&&!Object.is(value,s.const))return false;
 if(s.enum&&!s.enum.includes(value))return false;
 if(s.type){const allowed=Array.isArray(s.type)?s.type:[s.type];
  const valid=t=>t==='null'?value===null:t==='array'?Array.isArray(value):t==='integer'?Number.isInteger(value):t==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):typeof value===t;
  if(!allowed.some(valid))return false;}
 if(typeof value==='string'){
  if(s.minLength!==undefined&&value.length<s.minLength)return false;
  if(s.maxLength!==undefined&&value.length>s.maxLength)return false;
  if(s.pattern&&!new RegExp(s.pattern,'u').test(value))return false;
 }
 if(typeof value==='number'){
  if(s.minimum!==undefined&&value<s.minimum)return false;
  if(s.maximum!==undefined&&value>s.maximum)return false;
 }
 if(Array.isArray(value)){
  if(s.minItems!==undefined&&value.length<s.minItems)return false;
  if(s.maxItems!==undefined&&value.length>s.maxItems)return false;
  if(s.items&&!value.every(v=>check(v,s.items,root)))return false;
 }
 if(value!==null&&typeof value==='object'&&!Array.isArray(value)){
  const keys=Object.keys(value);
  if(s.required&&!s.required.every(k=>Object.hasOwn(value,k)))return false;
  if(s.additionalProperties===false&&!keys.every(k=>Object.hasOwn(s.properties??{},k)))return false;
  for(const [k,v] of Object.entries(value))if(s.properties?.[k]&&!check(v,s.properties[k],root))return false;
 }
 return true;
}
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
