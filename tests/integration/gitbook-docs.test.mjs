import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const docs=resolve(root,'horisift-cli-documentation');
test('GitBook navigation references all seven pages exactly once',()=>{
  const summary=readFileSync(resolve(docs,'SUMMARY.md'),'utf8');
  const targets=[...summary.matchAll(/\]\(([^)]+\.md)\)/g)].map(m=>m[1]);
  assert.equal(targets.length,7);
  assert.equal(new Set(targets).size,7);
  assert.deepEqual([...targets].sort(),readdirSync(docs).filter(p=>p.endsWith('.md')&&p!=='SUMMARY.md').sort());
});
test('GitBook relative page links resolve inside the documentation space',()=>{
  for(const name of readdirSync(docs).filter(p=>p.endsWith('.md'))){
    const page=resolve(docs,name);
    for(const m of readFileSync(page,'utf8').matchAll(/\]\(([^)]+)\)/g)){
      if(/^(https?:|#)/.test(m[1]))continue;
      const target=resolve(dirname(page),m[1].split('#')[0]);
      const within=relative(docs,target);
      assert.ok(within!==''&&within!=='..'&&!within.startsWith('..'+sep)&&!isAbsolute(within),name+': link escapes space');
      assert.ok(existsSync(target),name+': missing target '+m[1]);
    }
  }
});
test('GitBook getting-started candidate version agrees with package manifest',()=>{
  const manifest=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
  const intro=readFileSync(resolve(docs,'horisift-start-here.md'),'utf8');
  assert.ok(intro.includes('`'+manifest.version+'`'));
  assert.equal(manifest.private,true);
  assert.match(readFileSync(resolve(docs,'getting-started.md'),'utf8'),/not yet published/);
});
