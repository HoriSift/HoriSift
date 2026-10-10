import test from 'node:test';
import assert from 'node:assert/strict';
import { detectHorizonUsage } from '../../src/analysis/horizon.ts';
const scan = source => detectHorizonUsage('demo.js', source);
const uncertain = source => {
  const r=scan(source);
  assert.equal(r.status,'incomplete');
  assert.deepEqual(r.unknowns.map(u=>u.code), ['LEGACY_SDK_SERVER']);
  assert.equal(r.findings.length,0);
};
test('old default SDK import triggers conservative manual review',()=>uncertain("import SDK from 'stellar-sdk'; new SDK.Server('https://horizon.stellar.org');"));
test('old CommonJS binding triggers manual review',()=>uncertain("const SDK=require('stellar-sdk'); new SDK.Server('https://horizon.stellar.org');"));
test('renamed old namespace import triggers manual review',()=>uncertain("import * as OldSDK from 'stellar-sdk'; new OldSDK.Server('https://horizon.stellar.org');"));
test('computed literal constructor triggers manual review',()=>uncertain("import SDK from 'stellar-sdk'; new SDK['Server']('https://horizon.stellar.org');"));
test('const alias to old SDK triggers manual review',()=>uncertain("const SDK=require('stellar-sdk'); const alias=SDK; new alias.Server('https://horizon.stellar.org');"));
test('unrelated Server property is not inferred',()=>{const r=scan("const X = {Server: class {}}; new X.Server('https://horizon.stellar.org');");assert.equal(r.unknowns.length,0)});
test('shadowed historical SDK is not inferred',()=>{const r=scan("import SDK from 'stellar-sdk'; function run(SDK){ new SDK.Server('https://horizon.stellar.org') }");assert.equal(r.unknowns.length,0)});
test('reassigned legacy SDK cannot claim immutable constructor',()=>{const r=scan("let SDK=require('stellar-sdk'); SDK=other; new SDK.Server('https://horizon.stellar.org')");assert.ok(!r.unknowns.some(u=>u.code==='LEGACY_SDK_SERVER'))});
test('type-only import is not a runtime SDK',()=>{const r=scan("import type SDK from 'stellar-sdk'; new SDK.Server('https://horizon.stellar.org');");assert.ok(!r.unknowns.some(u=>u.code==='LEGACY_SDK_SERVER'))});
test('unrelated module is never treated as SDK',()=>{const r=scan("import SDK from 'other'; new SDK.Server('https://horizon.stellar.org');");assert.equal(r.unknowns.length,0)});
test('modern Horizon Server still produces supported finding',()=>{const r=scan("import {Horizon} from '@stellar/stellar-sdk'; new Horizon.Server('https://horizon.stellar.org');");assert.equal(r.findings[0]?.pattern,'sdk.Horizon.Server')});
test('legacy named constructor import is explicitly uncertain',()=>uncertain("import {Server as OldServer} from 'stellar-sdk'; new OldServer('https://horizon.stellar.org');"));
test('legacy CommonJS destructured constructor is explicitly uncertain',()=>uncertain("const {Server: OldServer}=require('stellar-sdk'); new OldServer('https://horizon.stellar.org');"));
test('constructor destructured from immutable namespace alias is uncertain',()=>uncertain("import SDK from 'stellar-sdk'; const alias=SDK; const {Server: OldServer}=alias; new OldServer('https://horizon.stellar.org');"));
test('legacy import equals is recognized in TypeScript',()=>{
  const r=detectHorizonUsage('demo.ts',"import SDK = require('stellar-sdk'); new SDK.Server('https://horizon.stellar.org');");
  assert.deepEqual(r.unknowns.map(u=>u.code),['LEGACY_SDK_SERVER']);
});
test('type-only import equals cannot provide constructor identity',()=>{
  const r=detectHorizonUsage('demo.ts',"import type SDK = require('stellar-sdk'); new SDK.Server('https://horizon.stellar.org');");
  assert.equal(r.unknowns.length,0);
});
test('named type-only constructor import is not runtime evidence',()=>{
  assert.equal(scan("import {type Server} from 'stellar-sdk'; new Server('https://horizon.stellar.org');").unknowns.length,0);
});
test('shadowed named constructor is not attributed to the SDK',()=>{
  assert.equal(scan("import {Server} from 'stellar-sdk'; function run(Server){ new Server('https://horizon.stellar.org'); }").unknowns.length,0);
});
test('shadowed require destructuring is not attributed to the SDK',()=>{
  assert.equal(scan("function run(require){ const {Server}=require('stellar-sdk'); new Server('https://horizon.stellar.org'); }").unknowns.length,0);
});
test('unrelated named Server export is not attributed to the SDK',()=>{
  assert.equal(scan("import {Server} from 'other'; new Server('https://horizon.stellar.org');").unknowns.length,0);
});
test('rest and fallback destructuring cannot confer constructor identity',()=>{
  for(const pattern of ['...Server','Server = fallback']) {
    const r=scan("const {"+pattern+"}=require('stellar-sdk'); new Server('https://horizon.stellar.org');");
    assert.equal(r.unknowns.length,0);
  }
});
test('reassigned destructured constructor signals mutable uncertainty',()=>{
  const r=scan("let {Server}=require('stellar-sdk'); Server=other; new Server('https://horizon.stellar.org');");
  assert.equal(r.status,'incomplete');
  assert.deepEqual(r.unknowns.map(u=>u.code),['MUTABLE_SDK_BINDING']);
});
test('legacy constructor alias chain records the constructor location',()=>{
  const r=scan("import {Server as S} from 'stellar-sdk';\nconst Alias=S;\nnew Alias('https://horizon.stellar.org');");
  assert.equal(r.unknowns[0]?.location.start.line,3);
  assert.equal(r.unknowns[0]?.location.start.column,5);
  assert.equal(JSON.stringify(r).includes('https://horizon.stellar.org'),false);
});
test('malformed named-constructor input cannot be declared complete',()=>{
  assert.equal(scan("import {Server} from 'stellar-sdk'; new Server(").status,'incomplete');
});
