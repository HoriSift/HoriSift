/** Read-only reproduction against already downloaded, detached public checkouts.
 * Never clones, installs target dependencies, reads target config, or runs target code. */
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(readFileSync(resolve(root,'docs/validation/manifest.json'),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
if(process.argv.length!==3){console.error('Usage: node scripts/verify-repository-corpus.mjs <checkout-collection>');process.exitCode=2;}
else {
  try {
    const collection=realpathSync(process.argv[2]);
    for(const entry of manifest.entries){
      const target=resolve(collection,entry.id);
      if(lstatSync(target).isSymbolicLink()||realpathSync(target)!==target)throw Error('Unsafe checkout root');
      const git=resolve(target,'.git'),head=resolve(git,'HEAD'),license=resolve(target,'LICENSE');
      if(!lstatSync(git).isDirectory()||lstatSync(git).isSymbolicLink())throw Error('Expected ordinary detached clone');
      for(const path of [head,license])if(!lstatSync(path).isFile()||lstatSync(path).isSymbolicLink()||lstatSync(path).size>100000)throw Error('Unsafe provenance file');
      if(readFileSync(head,'utf8').trim()!==entry.commit||sha(readFileSync(license))!==entry.licenseSha256)throw Error('Checkout provenance mismatch');
      const result=spawnSync(process.execPath,[resolve(root,'bin/horisift.mjs'),'scan',target,'--format','json'],{encoding:'utf8',shell:false,timeout:60000,maxBuffer:8*1024*1024});
      if(result.error||result.signal||result.status!==entry.expectedExit)throw Error('Scan failed or exit changed');
      if(sha(result.stdout)!==entry.reportSha256)throw Error('Report changed; review source and expectations');
      console.log(entry.id+': pinned report reproduced');
    }
  } catch(error){console.error('Corpus reproduction failed: '+error.message);process.exitCode=1;}
}
