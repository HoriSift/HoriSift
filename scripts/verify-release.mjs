/** Offline pack/repack integrity, optional registry-backed clean consumer install.
 * This creates a candidate tarball, not an npm publish, GitHub release or deployment.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(fileURLToPath(new URL('..', import.meta.url)));
const npmCli=process.env.npm_execpath || null;
const npm=process.platform==='win32'?'npm.cmd':'npm';
export const EXPECTED_FILES=Object.freeze([
  'LICENSE', 'README.md', 'package.json',
  'dist/analysis/horizon.js', 'dist/analysis/risk.js',
  'dist/cli/entry.js', 'dist/cli/main.js',
  'dist/parser/parse.js', 'dist/parser/read.js',
  'dist/reports/render.js', 'dist/rules/catalog.js', 'dist/scanner/discover.js',
]);
const releaseVersion=/^0\.1\.0-rc\.[1-9]\d*$/;
const sha256=(bytes)=>createHash('sha256').update(bytes).digest('hex');
export function inspectManifest(pkg,lock){
  const errors=[];
  if(pkg.name!=='horisift'||pkg.private!==true||!releaseVersion.test(pkg.version??''))errors.push('INVALID_PRIVATE_RC_MANIFEST');
  if(pkg.bin?.horisift!=='dist/cli/entry.js')errors.push('INVALID_COMPILED_BIN');
  if(JSON.stringify(pkg.files)!==JSON.stringify(['dist/','LICENSE','README.md']))errors.push('UNSAFE_PACKAGE_FILES_ALLOWLIST');
  if(pkg.type!=='module'||!pkg.engines?.node?.includes('22')||!pkg.engines?.node?.includes('24'))errors.push('UNSUPPORTED_RUNTIME_CONTRACT');
  if(lock.name!==pkg.name||lock.version!==pkg.version||lock.packages?.['']?.version!==pkg.version||lock.packages?.['']?.bin?.horisift!==pkg.bin?.horisift)errors.push('STALE_LOCKFILE');
  if(pkg.scripts?.prepare||pkg.scripts?.prepack||pkg.scripts?.postpack||pkg.scripts?.preinstall||pkg.scripts?.postinstall||pkg.scripts?.install)errors.push('UNEXPECTED_LIFECYCLE_SCRIPT');
  if(JSON.stringify(pkg.dependencies)!==JSON.stringify({typescript:'6.0.3'}))errors.push('UNPINNED_OR_UNEXPECTED_RUNTIME_DEPENDENCY');
  return errors;
}
export function inspectPackedEntries(entries, pkg){
  const paths=entries.map(x=>x.path).sort();
  const expected=[...EXPECTED_FILES].sort();
  const errors=[];
  if(JSON.stringify(paths)!==JSON.stringify(expected))errors.push('UNEXPECTED_PACKAGE_PAYLOAD');
  if(paths.some(p=>p.includes('..')||p.startsWith('/')||p.includes('\\')||/\.(?:map|ts|env|pem|key|tgz)$/i.test(p)))errors.push('POTENTIALLY_UNSAFE_PACKAGE_ENTRY');
  if(pkg.bin?.horisift&&!paths.includes(pkg.bin.horisift))errors.push('MISSING_PACKAGED_BIN');
  if(entries.some(x=>!Number.isSafeInteger(x.size)||x.size<0||x.size>1000000))errors.push('INVALID_PACKAGE_ENTRY_SIZE');
  return errors;
}
export function inspectBuiltFiles(base){
  const errors=[];
  for(const path of EXPECTED_FILES.filter(x=>x.startsWith('dist/'))){
    const full=resolve(base,path);
    if(!full.startsWith(base+sep)||!existsSync(full)||!lstatSync(full).isFile())errors.push('MISSING_OR_UNSAFE_BUILD_FILE');
  }
  const entry=resolve(base,'dist/cli/entry.js');
  if(existsSync(entry)&&!readFileSync(entry,'utf8').startsWith('#!/usr/bin/env node\n'))errors.push('MISSING_BIN_SHEBANG');
  return [...new Set(errors)];
}
export function verifyHash(bytes,expected){return /^[0-9a-f]{64}$/.test(expected)&&sha256(bytes)===expected;}
function execute(binary,args,opts={}){
  const result=spawnSync(binary,args,{cwd:root,encoding:'utf8',shell:false,windowsHide:true,timeout:110000,maxBuffer:8*1024*1024,...opts});
  if(result.error||result.signal||result.status!==0)throw Error('Release verification command failed: '+basename(String(binary))+' (exit '+String(result.status)+')');
  return result.stdout;
}
function executeNpm(args,opts={}){
  // npm run exports npm_execpath; launching its JS entry avoids Windows .cmd shell quirks.
  if(npmCli)return execute(process.execPath,[npmCli,...args],opts);
  return execute(npm,args,{...opts,shell:process.platform==='win32'});
}
function pack(dir){
  const json=JSON.parse(executeNpm(['pack','--ignore-scripts','--json','--pack-destination',dir]));
  if(!Array.isArray(json)||json.length!==1||!json[0]?.filename)throw Error('Pack metadata missing');
  const info=json[0];
  const path=resolve(dir,info.filename);
  if(!path.startsWith(resolve(dir)+sep)||!lstatSync(path).isFile())throw Error('Unsafe or missing pack result');
  return {info,path,bytes:readFileSync(path)};
}
function checkInstalledConsumer(tarPath,rcVersion,dir){
  mkdirSync(dir,{recursive:true});
  writeFileSync(join(dir,'package.json'),JSON.stringify({name:'horisift-tarball-consumer',private:true,version:'1.0.0',scripts:{'smoke:version':'horisift --version','smoke:rules':'horisift rules --format json'}},null,2)+'\n');
  executeNpm(['install','--ignore-scripts','--no-audit','--no-fund','--prefix',dir,tarPath],{cwd:dir});
  const actual=executeNpm(['run','--prefix',dir,'--silent','smoke:version'],{cwd:dir}).trim();
  if(actual!==rcVersion)throw Error('Installed npm command version differs from candidate');
  const rules=JSON.parse(executeNpm(['run','--prefix',dir,'--silent','smoke:rules'],{cwd:dir}));
  if(!Array.isArray(rules.rules)||rules.rules.length!==25)throw Error('Installed bin rule catalog smoke failed');
  const installed=join(dir,'node_modules','horisift');
  const entry=join(installed,'dist','cli','entry.js');
  const metadata=JSON.parse(readFileSync(join(installed,'package.json'),'utf8'));
  if(metadata.version!==rcVersion||metadata.private!==true||!existsSync(entry)||existsSync(join(installed,'src'))||existsSync(join(installed,'tests'))||existsSync(join(installed,'site')))throw Error('Unexpected installed package payload');
  const sample=join(dir,'sample-source');mkdirSync(sample);
  writeFileSync(join(sample,'example.js'),"fetch('https://horizon.stellar.org/accounts');\n");
  const scan=spawnSync(process.execPath,[entry,'scan',sample,'--format','json','--fail-on','high'],{cwd:dir,encoding:'utf8',timeout:25000,windowsHide:true,maxBuffer:4*1024*1024});
  if(scan.error||scan.status!==1||!scan.stdout)throw Error('Installed CLI scan threshold/exit check failed');
  const report=JSON.parse(scan.stdout);
  if(report.toolVersion!==rcVersion||report.root!=='.'||report.summary.findings<1||scan.stdout.includes(sample))throw Error('Installed CLI finding, version or privacy mismatch');
  const help=execute(process.execPath,[entry,'--help'],{cwd:dir});
  if(!help.includes('scan <path>'))throw Error('Installed CLI help mismatch');
  return {version:actual,ruleCount:rules.rules.length,scanFindings:report.summary.findings,scanExit:scan.status};
}
export function runRelease(mode='verify',base=root){
  if(!['verify','pack'].includes(mode))throw Error('Invalid release verification mode');
  const pkg=JSON.parse(readFileSync(join(base,'package.json'),'utf8'));
  const lock=JSON.parse(readFileSync(join(base,'package-lock.json'),'utf8'));
  const errors=[...inspectManifest(pkg,lock),...inspectBuiltFiles(base)];
  if(errors.length)throw Error('Release preflight rejected: '+[...new Set(errors)].join(', '));
  const tmp=mkdtempSync(join(tmpdir(),'horisift-rc-verification-'));
  try{
    const dirA=join(tmp,'pack-a'),dirB=join(tmp,'pack-b');mkdirSync(dirA);mkdirSync(dirB);
    const first=pack(dirA),second=pack(dirB);
    const checks=[...inspectPackedEntries(first.info.files,pkg),...inspectPackedEntries(second.info.files,pkg)];
    if(checks.length)throw Error('Package allowlist failed: '+[...new Set(checks)].join(', '));
    const one=sha256(first.bytes),two=sha256(second.bytes);
    if(one!==two||first.bytes.length!==second.bytes.length)throw Error('Two candidate packs are not byte-reproducible');
    if(!verifyHash(second.bytes,one))throw Error('Candidate checksum verification failed');
    const output={name:pkg.name,version:pkg.version,sha256:one,bytes:first.bytes.length,files:first.info.files.length,private:true,mode};
    if(mode==='verify')output.installedConsumer=checkInstalledConsumer(first.path,pkg.version,join(tmp,'consumer'));
    else{
      const dest=resolve(base,'release-artifacts');mkdirSync(dest,{recursive:true});
      const tar=resolve(dest,first.info.filename);
      if(!tar.startsWith(dest+sep))throw Error('Invalid artifact output');
      copyFileSync(first.path,tar);
      writeFileSync(tar+'.sha256',one+'  '+basename(tar)+'\n');
      output.artifact=tar;output.checksumFile=tar+'.sha256';
    }
    return output;
  }finally{rmSync(tmp,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try { console.log(JSON.stringify(runRelease(process.argv[2]??'verify'))); }
  catch { console.error('HoriSift release candidate verification failed; no package was published.'); process.exitCode=1; }
}
