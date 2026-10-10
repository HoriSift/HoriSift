import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectBuiltFiles, inspectManifest, inspectPackedEntries, EXPECTED_FILES, verifyHash } from '../../scripts/verify-release.mjs';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const packageJson=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
const lock=JSON.parse(readFileSync(join(root,'package-lock.json'),'utf8'));
const clone=x=>structuredClone(x);
const validEntries=()=>EXPECTED_FILES.map(path=>({path,size:100}));
const temporary=callback=>{const p=mkdtempSync(join(tmpdir(),'horisift-release-fixture-'));try{return callback(p);}finally{rmSync(p,{recursive:true,force:true});}};

test('release candidate is private, pre-release versioned, compiler-output-only and locked',()=>{
  assert.deepEqual(inspectManifest(packageJson,lock),[]);
  assert.equal(packageJson.version,'0.1.0-rc.1');
  assert.equal(packageJson.private,true);
  assert.equal(packageJson.bin.horisift,'dist/cli/entry.js');
});
test('packed allowlist has exactly compiled modules and obligatory legal files',()=>{
  assert.deepEqual(inspectPackedEntries(validEntries(),packageJson),[]);
  assert.equal(EXPECTED_FILES.length,12);
  assert.ok(EXPECTED_FILES.includes('README.md')&&EXPECTED_FILES.includes('LICENSE'));
});
test('manifest refuses accidental public publish configuration',()=>{
  const p=clone(packageJson);p.private=false;assert.ok(inspectManifest(p,lock).includes('INVALID_PRIVATE_RC_MANIFEST'));
});
test('manifest refuses stable or incorrectly formatted package version',()=>{
  for(const version of ['0.1.0','0.0.0','0.1.0-rc.0','0.1.0-rc.1-pre']){
    const p=clone(packageJson);p.version=version;
    assert.ok(inspectManifest(p,lock).includes('INVALID_PRIVATE_RC_MANIFEST'));
  }
});
test('manifest refuses source-only CLI bins',()=>{
  const p=clone(packageJson);p.bin.horisift='./bin/horisift.mjs';assert.ok(inspectManifest(p,lock).includes('INVALID_COMPILED_BIN'));
});
test('manifest rejects packaging entire working repo',()=>{
  for(const files of [['*'],['dist/','src/','LICENSE'],['dist/','site/','LICENSE']]){
    const p=clone(packageJson);p.files=files;
    assert.ok(inspectManifest(p,lock).includes('UNSAFE_PACKAGE_FILES_ALLOWLIST'));
  }
});
test('manifest requires version-synchronized lock and installed command mapping',()=>{
  const bad=clone(lock);bad.packages[''].bin.horisift='bin/horisift.mjs';
  assert.ok(inspectManifest(packageJson,bad).includes('STALE_LOCKFILE'));
});
test('manifest refuses runtime dependencies other than exact pinned TypeScript',()=>{
  const p=clone(packageJson);p.dependencies.typescript='^6.0.3';
  assert.ok(inspectManifest(p,lock).includes('UNPINNED_OR_UNEXPECTED_RUNTIME_DEPENDENCY'));
});
test('manifest rejects package scripts that would execute on install or pack',()=>{
  for(const lifecycle of ['prepare','prepack','postpack','preinstall','install','postinstall']){
    const p=clone(packageJson);p.scripts[lifecycle]='echo unsafe';
    assert.ok(inspectManifest(p,lock).includes('UNEXPECTED_LIFECYCLE_SCRIPT'));
  }
});
test('payload refuses accidental site, tests and raw TS source',()=>{
  for(const path of ['site/index.html','src/analysis/horizon.ts','tests/golden/rules.json','AGENTS.md']){
    assert.ok(inspectPackedEntries([...validEntries(),{path,size:1}],packageJson).includes('UNEXPECTED_PACKAGE_PAYLOAD'));
  }
});
test('payload refuses malicious absolute, traversal or separator names',()=>{
  for(const path of ['/etc/passwd','../secrets.txt','dist\\private.js','dist/.env','dist/source.map']){
    assert.ok(inspectPackedEntries([...validEntries(),{path,size:1}],packageJson).includes('POTENTIALLY_UNSAFE_PACKAGE_ENTRY'));
  }
});
test('payload requires executable entry in package',()=>{
  const rows=validEntries().filter(x=>x.path!=='dist/cli/entry.js');
  assert.ok(inspectPackedEntries(rows,packageJson).includes('MISSING_PACKAGED_BIN'));
});
test('payload refuses malformed, huge or negative entry sizes',()=>{
  for(const size of [-1,1000001,NaN]){
    const rows=validEntries();rows[0].size=size;
    assert.ok(inspectPackedEntries(rows,packageJson).includes('INVALID_PACKAGE_ENTRY_SIZE'));
  }
});
test('source-built CLI entry retains portable Node shebang and complete JS output',()=>{
  assert.deepEqual(inspectBuiltFiles(root),[]);
});
test('build audit rejects missing files and detects absent shebang',()=>temporary(dir=>{
  mkdirSync(join(dir,'dist/cli'),{recursive:true});
  writeFileSync(join(dir,'dist/cli/entry.js'),'import "./main.js";\n');
  const issues=inspectBuiltFiles(dir);
  assert.ok(issues.includes('MISSING_BIN_SHEBANG'));
  assert.ok(issues.includes('MISSING_OR_UNSAFE_BUILD_FILE'));
}));
test('SHA-256 verification rejects altered bytes, case-mismatched hashes and invalid digests',()=>{
  const bytes=Buffer.from('immutable candidate payload');
  const hash=createHash('sha256').update(bytes).digest('hex');
  assert.equal(verifyHash(bytes,hash),true);
  assert.equal(verifyHash(Buffer.from('changed payload'),hash),false);
  assert.equal(verifyHash(bytes,hash.toUpperCase()),false);
  assert.equal(verifyHash(bytes,'not-a-digest'),false);
});
test('pack command and clean install checks are explicitly invoked only as separate release scripts',()=>{
  assert.equal(packageJson.scripts['release:verify'],'node scripts/verify-release.mjs verify');
  assert.equal(packageJson.scripts['release:pack'],'node scripts/verify-release.mjs pack');
  assert.equal(packageJson.private,true);
});
