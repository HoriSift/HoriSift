import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditSite, compareBuiltSite, contrast} from '../../scripts/check-site.mjs';
import {buildSite} from '../../scripts/build-site.mjs';

const ROOT=resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SITE=resolve(ROOT,'site');
function fixture(callback){
  const root=mkdtempSync(join(tmpdir(),'horisift-site-test-'));
  try{
    cpSync(SITE,resolve(root,'site'),{recursive:true});
    const edit=(name,oldValue,newValue)=>{
      const path=resolve(root,'site',name),source=readFileSync(path,'utf8');
      assert.ok(source.includes(oldValue),`missing replacement marker: ${oldValue}`);
      writeFileSync(path,source.replace(oldValue,newValue));
    };
    return callback({root,site:resolve(root,'site'),edit});
  }finally{rmSync(root,{recursive:true,force:true});}
}
const has=(errors,code)=>assert.ok(errors.some(e=>e.includes(code)),`expected ${code}; got: ${errors.join(' | ')}`);

// These are independent narrow static checks; browser accessibility audits are separately documented.
test('source site passes complete static audit',()=>assert.deepEqual(auditSite(SITE),[]));
test('site build copies exactly four expected files with no network or generator',()=>fixture(({root})=>{
  const result=buildSite(root);
  assert.equal(result.files.length,4);
  assert.ok(existsSync(resolve(root,'dist-site/index.html')));
  assert.deepEqual(compareBuiltSite(root),[]);
}));
test('build is byte-identical across successive executions',()=>fixture(({root})=>{
  buildSite(root);
  const old=readFileSync(resolve(root,'dist-site/index.html'));
  buildSite(root);
  assert.deepEqual(readFileSync(resolve(root,'dist-site/index.html')),old);
}));
test('build comparison notices modified emitted asset',()=>fixture(({root})=>{
  buildSite(root);
  writeFileSync(resolve(root,'dist-site/styles.css'),'tampered');
  has(compareBuiltSite(root),'modified build asset');
}));
test('build refuses symlink source asset',(t)=>fixture(({root})=>{
  const loc=resolve(root,'site/assets/horisift-mark.svg');
  rmSync(loc);
  try{symlinkSync(resolve(root,'site/index.html'),loc);}catch(error){
    if(['EPERM','EACCES','ENOSYS','ENOTSUP'].includes(error.code)){t.skip('symlink creation unavailable');return;}
    throw error;
  }
  assert.throws(()=>buildSite(root),/Unsafe site source/);
}));
test('build refuses deleted source',()=>fixture(({root})=>{
  rmSync(resolve(root,'site/styles.css'));
  assert.throws(()=>buildSite(root));
}));
test('main body copy passes WCAG AA contrast check',()=>assert.ok(contrast('#eff7ff','#071527')>7));
test('muted text passes WCAG AA contrast check',()=>assert.ok(contrast('#b8c9d9','#071527')>=4.5));
test('primary button text passes WCAG AA contrast check',()=>assert.ok(contrast('#102219','#b7ef91')>=4.5));
test('known warning and error states pass WCAG AA text contrast',()=>{
  assert.ok(contrast('#ffe1aa','#54452e')>=4.5);
  assert.ok(contrast('#ffc3c1','#573537')>=4.5);
});
test('invalid color in contrast metric is rejected',()=>assert.throws(()=>contrast('red','#071527'),/invalid color/));
test('doctype absence is rejected',()=>fixture(({site,edit})=>{edit('index.html','<!doctype html>','');has(auditSite(site),'doctype')}));
test('wrong document language is rejected',()=>fixture(({site,edit})=>{edit('index.html','lang="en"','lang=""');has(auditSite(site),'document language')}));
test('missing mobile viewport is rejected',()=>fixture(({site,edit})=>{edit('index.html','name="viewport"','name="wrong-viewport"');has(auditSite(site),'viewport')}));
test('duplicate main heading is rejected',()=>fixture(({site,edit})=>{edit('index.html','</h1>','</h1><h1>Duplicate</h1>');has(auditSite(site),'one h1')}));
test('absent skip-navigation link is rejected',()=>fixture(({site,edit})=>{edit('index.html','class="skip-link"','class="skip-link-disabled"');has(auditSite(site),'skip link')}));
test('broken section navigation is rejected',()=>fixture(({site,edit})=>{edit('index.html','href="#real-world"','href="#missing"');has(auditSite(site),'missing anchor')}));
test('unapproved external URL is rejected',()=>fixture(({site,edit})=>{edit('index.html','href="https://github.com/HoriSift/HoriSift"','href="https://malicious.example/tracker"');has(auditSite(site),'unapproved outbound URL')}));
test('javascript URL is rejected',()=>fixture(({site,edit})=>{edit('index.html','href="#how-it-works"','href="javascript:alert(1)"');has(auditSite(site),'active or third-party embedded content')}));
test('inline script injection is rejected',()=>fixture(({site,edit})=>{edit('index.html','</body>','<script>alert(1)</script></body>');has(auditSite(site),'active or third-party embedded content')}));
test('tracking script is rejected',()=>fixture(({site,edit})=>{edit('index.html','</body>','<script src="https://analytics.example/track.js"></script></body>');has(auditSite(site),'active or third-party embedded content')}));
test('image missing its alternative text is rejected',()=>fixture(({site,edit})=>{edit('index.html','alt="HoriSift mark"','alt=""');has(auditSite(site),'broken/nonaccessible img')}));
test('missing logo asset fails safely',()=>fixture(({site})=>{rmSync(resolve(site,'assets/horisift-wordmark.svg'));has(auditSite(site),'missing/unsafe')}));
test('injected SVG foreignObject is rejected',()=>fixture(({site,edit})=>{edit('assets/horisift-mark.svg','</svg>','<foreignObject></foreignObject></svg>');has(auditSite(site),'unsafe or inaccessible vector')}));
test('CSS remote imports are rejected',()=>fixture(({site,edit})=>{edit('styles.css',':root{','@import url(https://tracker.example/a.css);\n:root{');has(auditSite(site),'CSS requires remote')}));
test('keyboard focus CSS cannot disappear silently',()=>fixture(({site})=>{const path=resolve(site,'styles.css');writeFileSync(path,readFileSync(path,'utf8').replaceAll('a:focus-visible','a:focus-within'));has(auditSite(site),'keyboard/reduced-motion')}));
test('reduced motion CSS cannot disappear silently',()=>fixture(({site,edit})=>{edit('styles.css','prefers-reduced-motion:reduce','prefers-reduced-motion:no-preference');has(auditSite(site),'keyboard/reduced-motion')}));
test('mobile breakpoint cannot disappear silently',()=>fixture(({site,edit})=>{edit('styles.css','@media(max-width:690px)','@media(max-width:699px)');has(auditSite(site),'responsive/tables')}));
test('known false-negative disclosure is required',()=>fixture(({site,edit})=>{edit('index.html','https://github.com/HoriSift/HoriSift/issues/1','https://github.com/HoriSift/HoriSift');has(auditSite(site),'known detector bug')}));
test('unpublished software disclosure is required',()=>fixture(({site,edit})=>{edit('index.html','No published npm package yet.','Published and production-ready.');has(auditSite(site),'unpublished disclosure')}));
test('docs site cannot invent an npm install command',()=>{
  const text=readFileSync(resolve(SITE,'index.html'),'utf8');
  assert.doesNotMatch(text,/npm install (?:-g )?horisift\b/);
  assert.match(text,/npm ci --ignore-scripts/);
});
test('no source code is transferred to any external script, font or analytics',()=>{
  const text=readFileSync(resolve(SITE,'index.html'),'utf8');
  assert.doesNotMatch(text,/<script\b|<form\b|fonts\.googleapis|google-analytics|<iframe\b/);
  assert.match(text,/Content-Security-Policy/);
});
test('heading and notice texts preserve authentic observed evidence',()=>{
  const text=readFileSync(resolve(SITE,'index.html'),'utf8');
  for(const label of ['Axelar · Stellar faucet','Soroswap · configuration','Stellar Wind · legacy SDK','False negative','No hosted scanner'])assert.ok(text.includes(label),label);
  assert.ok(text.includes('not proof of a Horizon-free application'));
});
