/** Offline static asset build. Never deploys, invokes a site generator or uses the network. */
import {cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {resolve, join, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(fileURLToPath(new URL('..',import.meta.url)));
const FILES=['index.html','styles.css','assets/horisift-mark.svg','assets/horisift-wordmark.svg'];
export function buildSite(root=ROOT){
  const src=resolve(root,'site'),target=resolve(root,'dist-site');
  for(const name of FILES){
    const full=resolve(src,name),st=lstatSync(full);
    if(!st.isFile()||st.isSymbolicLink())throw Error(`Unsafe site source: ${name}`);
  }
  rmSync(target,{recursive:true,force:true});
  mkdirSync(resolve(target,'assets'),{recursive:true});
  for(const name of FILES){
    const bytes=readFileSync(resolve(src,name));
    writeFileSync(resolve(target,name),bytes);
  }
  return {directory:target,files:[...FILES]};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=buildSite();
  console.log(`Built ${result.files.length} static files in dist-site/ (no deployment).`);
}
