import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSource } from '../../src/parser/parse.ts';

const parse = (text, file='src/main.ts') => parseSource(file,text);
test('finds named and renamed ESM SDK imports with accurate positions', () => {
  const r=parse("// header\nimport { Horizon as Hz, rpc } from '@stellar/stellar-sdk';\nconst cli = Hz;\n");
  assert.equal(r.status,'complete');
  assert.deepEqual(r.imports.map(x=>[x.module,x.importedName,x.localName,x.location.start.line,x.location.start.column]),[
    ['@stellar/stellar-sdk','Horizon','Hz',2,21],
    ['@stellar/stellar-sdk','rpc','rpc',2,25],
  ]);
  assert.deepEqual(r.aliases.map(x=>[x.localName,x.target]),[['cli',['Hz']]]);
});
test('namespace and default ESM syntax is recorded without semantic SDK assertion',()=>{
  const r=parse("import * as Stellar from '@stellar/stellar-sdk';\nimport Legacy from 'stellar-sdk';");
  assert.deepEqual(r.imports.map(x=>[x.importedName,x.localName]),[['*','Stellar'],['default','Legacy']]);
});
test('CommonJS require aliases and renamed destructuring',()=>{
  const r=parse("const S = require('stellar-sdk');\nconst { Horizon: H, rpc } = require('@stellar/stellar-sdk');",'app.cjs');
  assert.deepEqual(r.imports.map(x=>[x.importedName,x.localName,x.syntax]),[['*','S','commonjs'],['Horizon','H','commonjs'],['rpc','rpc','commonjs']]);
});
test('TypeScript import-equals external module syntax',()=>{
  const r=parse("import SDK = require('stellar-sdk');",'a.cts');
  assert.deepEqual(r.imports.map(x=>x.localName),['SDK']);
});
test('ignores comments, harmless strings and non-SDK imports',()=>{
  const r=parse("/* import { Horizon } from 'stellar-sdk' */\nconst s=\"require('stellar-sdk')\";\nimport H from 'not-stellar-sdk';");
  assert.equal(r.imports.length,0);assert.equal(r.status,'complete');
});
test('type-only imports are ignored',()=>{
  const r=parse("import type { Horizon } from 'stellar-sdk';\nimport { type Foo, rpc } from '@stellar/stellar-sdk';");
  assert.deepEqual(r.imports.map(x=>x.importedName),['rpc']);
});
test('TSX/JSX, MTS and MJS each get correct parser mode',()=>{
  for(const [file,syntax] of [['view.tsx','tsx'],['view.jsx','jsx'],['core.mts','ts'],['lib.mjs','js']]) {
    const r=parseSource(file,"const value = 1;",1000);
    assert.equal(r.syntax,syntax); assert.equal(r.status,'complete');
  }
});
test('does not claim imported facts from syntactically invalid files',()=>{
  const r=parse("import { Horizon } from 'stellar-sdk';\nconst = ;");
  assert.equal(r.status,'incomplete');assert.equal(r.imports.length,0);assert.ok(r.diagnostics.some(x=>x.code==='INVALID_SYNTAX'));
  assert.ok(r.diagnostics.every(x=>!JSON.stringify(x).includes('const =')));
});
test('malformed syntax diagnostic carries 1-based bounded source location',()=>{
  const r=parse("\n\nconst = ;");
  assert.equal(r.status,'incomplete');const loc=r.diagnostics.find(x=>x.code==='INVALID_SYNTAX').location;
  assert.equal(loc.start.line,3);assert.ok(loc.start.column>=1);assert.ok(loc.end.column>=loc.start.column);
});
test('dynamic import, dynamic require produce unknown without guessed import',()=>{
  const r=parse("const name = process.env.SDK;\nconst S = require(name);\nconst R = import(name);");
  assert.equal(r.imports.length,0);assert.equal(r.status,'incomplete');assert.equal(r.diagnostics.filter(x=>x.code==='DYNAMIC_MODULE').length,2);
});
test('literal dynamic import is not promoted to supported imported binding',()=>{
  const r=parse("async function load(){return import('stellar-sdk')}");
  assert.equal(r.imports.length,0);assert.equal(r.status,'complete');
});
test('unknown file types and declaration files are marked incomplete',()=>{
  for(const file of ['index.py','types.d.ts','types.d.mts','types.d.cts']){
    const r=parseSource(file,'let a = 1;');assert.equal(r.status,'incomplete');assert.deepEqual(r.imports,[]);assert.equal(r.diagnostics[0].code,'UNSUPPORTED_EXTENSION');
  }
});
test('invalid paths, source types and budget are rejected without leaking text',()=>{
  for(const file of ['../secrets.ts','/etc/passwd','a\\b.ts','a//b.ts','a\u0000.ts']) assert.throws(()=>parseSource(file,'ok'));
  assert.throws(()=>parseSource('a.ts',/** @type {any} */ (null)));
  assert.throws(()=>parseSource('a.ts','ok',0));
  const r=parseSource('a.ts','long private key',3);assert.equal(r.status,'incomplete');assert.equal(r.diagnostics[0].code,'SOURCE_TOO_LARGE');
  assert.ok(!JSON.stringify(r).includes('private key'));
});
test('unicode locations are 1-based TypeScript UTF-16 columns and deterministic',()=>{
  const s="const icon = '💫';\nimport { Horizon as H } from 'stellar-sdk';";
  const a=parse(s,'привет/🔭.ts'),b=parse(s,'привет/🔭.ts');assert.equal(JSON.stringify(a),JSON.stringify(b));
  assert.equal(a.imports[0].location.start.line,2);assert.equal(a.imports[0].location.start.column,21);
});
test('const property and identifier aliases recorded as syntax only',()=>{
  const r=parse("import * as Stellar from 'stellar-sdk';\nconst H = Stellar.Horizon;\nlet M = H;\nconst { horizon } = Stellar;\nconst V = H;");
  assert.deepEqual(r.aliases.map(x=>[x.localName,x.target]),[['H',['Stellar','Horizon']],['V',['H']]]);
});
test('unsupported wrappers, side effect SDK import, and non-static computed property are not invented as bindings',()=>{
  const r=parse("import 'stellar-sdk';\nconst w = wrapper();\nconst z = object[field];");
  assert.equal(r.status,'complete');assert.equal(r.imports.length,0);assert.equal(r.aliases.length,0);
});
