/** Exercise the emitted Node.js JavaScript build without executing scanned source. */
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const executable=resolve(root,'dist/cli/entry.js');
const run=(...args)=>spawnSync(process.execPath,[executable,...args],{cwd:root,encoding:'utf8',shell:false,timeout:20000,maxBuffer:4*1024*1024});
const check=(condition,message)=>{if(!condition)throw new Error('Build smoke failed: '+message);};
const help=run('--help');check(help.status===0&&help.stdout.includes('scan <path>'),'compiled CLI help');
const version=run('--version');check(version.status===0&&version.stdout.trim()==='0.0.0','compiled version');
const rules=run('rules','--format','json');check(rules.status===0&&JSON.parse(rules.stdout).rules.length===25,'compiled catalog');
const dir=mkdtempSync(join(tmpdir(),'horisift-build-'));
try{
  writeFileSync(join(dir,'example.js'),"fetch('https://horizon.stellar.org/accounts');\n");
  const found=run('scan',dir,'--format','json','--fail-on','high');
  check(found.status===1,'compiled scan finding exit');
  const report=JSON.parse(found.stdout);
  check(report.summary.findings>0&&report.root==='.'&&!found.stdout.includes(dir),'compiled report normalized/no root');
}finally{rmSync(dir,{force:true,recursive:true});}
console.log('Emitted JavaScript CLI: help/version/rules/scan smoke checks passed.');
