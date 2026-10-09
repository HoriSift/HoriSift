import test from 'node:test';
import assert from 'node:assert/strict';
import {parseArguments,runCli} from '../../src/cli/main.ts';
import {assessHorizonUsage} from '../../src/analysis/risk.ts';
import {RULES} from '../../src/rules/catalog.ts';
const assess=()=>({...assessHorizonUsage('src/index.ts',"import {Horizon} from '@stellar/stellar-sdk';const c=new Horizon.Server('https://horizon.stellar.org'); c.accounts().call();"),root:'.',filesInspected:1});
test('regression: --severity must not suppress JSON findings',async()=>{
 const output=[];const code=await runCli(['scan','path','--format','json','--severity','high'],{stdout:s=>output.push(s),stderr:()=>{},assess:async()=>assess(),rules:RULES});
 assert.equal(code,0);assert.ok(JSON.parse(output[0]).findings.length>=1);
});
test('regression: --allow-incomplete cannot change JSON status or triage',async()=>{
 const src={...assessHorizonUsage('src/index.ts','const broken = ('),root:'.',filesInspected:1};const out=[];
 await runCli(['scan','path','--allow-incomplete','--format','json'],{stdout:s=>out.push(s),stderr:()=>{},assess:async()=>src,rules:RULES});
 assert.equal(JSON.parse(out[0]).status,'incomplete');assert.equal(JSON.parse(out[0]).triage,'incomplete');
});
test('regression: unsafe CLI control characters rejected before any path access',()=>{
 for(const s of ['a\nTOP_SECRET','x\u0000','a\rHOME'])assert.throws(()=>parseArguments(['scan',s]));
});
test('regression: cannot hide findings with presentation filter to defeat CI threshold',async()=>{
 const out=[];const c=await runCli(['scan','x','--severity','high','--fail-on','low'],{stdout:s=>out.push(s),stderr:()=>{},assess:async()=>assess(),rules:RULES});
 assert.equal(c,1);assert.match(out[0],/Findings:/);
});
test('regression: errors never reveal untrusted exception messages',async()=>{
 const output=[];const err=[];const code=await runCli(['scan','secret'],{stdout:s=>output.push(s),stderr:s=>err.push(s),assess:async()=>{throw new Error('secret=abc /private/password');},rules:RULES});
 assert.equal(code,3);assert.equal(output.length,0);assert.ok(!err.join('').includes('abc'));
});
