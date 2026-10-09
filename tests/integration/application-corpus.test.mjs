import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assessHorizonRepository } from '../../src/analysis/risk.ts';
import { renderScanJson, renderScanText } from '../../src/reports/render.ts';

const corpus = JSON.parse(await readFile(fileURLToPath(new URL('../fixtures/application-corpus.json', import.meta.url)), 'utf8'));
const ordinal = (a,b)=>a < b ? -1 : a > b ? 1 : 0;
const roots = async (fn) => {
  const root = await mkdtemp(join(tmpdir(), 'horisift-application-corpus-'));
  try { return await fn(root); } finally { await rm(root, { recursive:true, force:true }); }
};
async function populate(root, files, reverse=false) {
  for(const [rel, content] of Object.entries(files).sort((a,b)=>reverse?ordinal(b[0],a[0]):ordinal(a[0],b[0]))) {
    const full=join(root,...rel.split('/'));
    assert.ok(resolve(full).startsWith(resolve(root)));
    await mkdir(dirname(full),{recursive:true});
    await writeFile(full,content,'utf8');
  }
}

test('synthetic application corpus is versioned, bounded and uses no absolute paths',()=>{
  assert.equal(corpus.schema,1);
  assert.equal(corpus.cases.length,6);
  const ids=new Set();
  for(const row of corpus.cases){
    assert.match(row.id,/^[a-z][a-z-]+$/);assert.ok(!ids.has(row.id));ids.add(row.id);
    assert.ok(Object.keys(row.files).length>=1 && Object.keys(row.files).length<=12);
    for(const [path,source] of Object.entries(row.files)){
      assert.match(path,/^src\/[\p{L}\p{N}_./-]+\.(?:js|jsx|mjs|cjs|ts|tsx|mts|cts)$/u);
      assert.ok(!path.includes('..'));assert.ok(source.length>0 && source.length<4096);
    }
  }
});
for(const row of corpus.cases){
  test(`realistic synthetic ${row.id}: source-to-risk status and covered rules`, async()=>roots(async root=>{
    await populate(root,row.files);
    const r=await assessHorizonRepository(root);
    assert.equal(r.status,row.expectedStatus);
    assert.equal(r.filesInspected,Object.keys(row.files).length);
    const rules=new Set(r.findings.map(x=>x.ruleId));
    for(const id of row.requiredRuleIds)assert.ok(rules.has(id),`${row.id}: missing ${id}; got ${[...rules]}`);
    for(const id of row.requiredDiagnosticCodes??[])assert.ok(r.diagnostics.some(x=>x.code===id));
    for(const id of row.requiredUnknownCodes??[])assert.ok(r.unknowns.some(x=>x.code===id));
    if(row.id==='negative-literal-noise') assert.equal(r.findings.length,0);
    const json=renderScanJson(r,'0.0.0');
    const output=JSON.parse(json);assert.equal(output.status,row.expectedStatus);
    assert.equal(output.findings.length,r.summary.findings);
    assert.ok(!json.includes(root));
    assert.doesNotMatch(json,/sk_live|TOP_SECRET|authorization=|Bearer /);
    assert.match(renderScanText(r,'info'),/NOT proof of migration readiness/);
  }));
  test(`synthetic ${row.id}: different creation order yields byte-exact report`,async()=>roots(async a=>roots(async b=>{
    await populate(a,row.files);
    await populate(b,row.files,true);
    const x=renderScanJson(await assessHorizonRepository(a),'0.0.0');
    const y=renderScanJson(await assessHorizonRepository(b),'0.0.0');
    assert.equal(x,y);
  })));
}
