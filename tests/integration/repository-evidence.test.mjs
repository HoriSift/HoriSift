import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const dir=fileURLToPath(new URL('../../docs/validation/',import.meta.url));
const manifest=JSON.parse(readFileSync(dir+'manifest.json','utf8'));
const schema=JSON.parse(readFileSync(fileURLToPath(new URL('../../schemas/scan-report.v1.schema.json',import.meta.url)),'utf8'));
const validate=new Ajv2020({strict:true,allErrors:true}).compile(schema);
for(const entry of manifest.entries){
  test('recorded full-checkout report: '+entry.id,()=>{
    assert.match(entry.commit,/^[a-f0-9]{40}$/);
    const bytes=readFileSync(dir+entry.report);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.reportSha256);
    const report=JSON.parse(bytes);
    assert.equal(validate(report),true,JSON.stringify(validate.errors));
    assert.equal(report.filesInspected,entry.filesInspected);
    assert.equal(report.findings.length,entry.findings);
    assert.equal(report.unknowns.length,entry.unknowns);
    assert.equal(report.diagnostics.length,entry.diagnostics);
    assert.equal(report.status,'incomplete');
    assert.equal(report.root,'.');
  });
}
const harness=fileURLToPath(new URL('../../scripts/verify-repository-corpus.mjs',import.meta.url));
test('corpus harness requires exactly one explicit collection directory',()=>{
  const r=spawnSync(process.execPath,[harness],{encoding:'utf8',timeout:10000});assert.equal(r.status,2);assert.match(r.stderr,/Usage:/);
});
for(const mode of ['wrong revision','wrong license']){
  test('corpus harness fails closed on '+mode,()=>{
    const root=mkdtempSync(join(tmpdir(),'horisift-corpus-'));
    try {
      const target=join(root,manifest.entries[0].id);mkdirSync(join(target,'.git'),{recursive:true});
      writeFileSync(join(target,'.git','HEAD'),mode==='wrong revision'?'ref: refs/heads/main\n':manifest.entries[0].commit+'\n');
      writeFileSync(join(target,'LICENSE'),'invalid license');
      const r=spawnSync(process.execPath,[harness,root],{encoding:'utf8',timeout:10000});
      assert.equal(r.status,1);assert.match(r.stderr,/provenance mismatch/);assert.equal(r.stdout,'');
    }finally{rmSync(root,{recursive:true,force:true});}
  });
}
