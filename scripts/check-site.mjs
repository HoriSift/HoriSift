/** Dependency-free *static* checks; not a substitute for an automated axe/browser audit. */
import {readFileSync,lstatSync,existsSync} from 'node:fs';
import {resolve,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pathToFileURL} from 'node:url';
import {buildSite} from './build-site.mjs';
const ROOT=resolve(fileURLToPath(new URL('..',import.meta.url)));
const FILES=['index.html','styles.css','assets/horisift-mark.svg','assets/horisift-wordmark.svg'];
const EXTERNAL=['https://github.com/HoriSift/HoriSift','https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc'];
const matchAttributes=(tag)=>Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const luminance=hex=>{
  if(!/^#[0-9a-fA-F]{6}$/.test(hex))throw Error('invalid color');
  const a=[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return .2126*a[0]+.7152*a[1]+.0722*a[2];
};
export const contrast=(fg,bg)=>{const [a,b]=[luminance(fg),luminance(bg)].sort((x,y)=>y-x);return(a+.05)/(b+.05)};
function safeLocalPath(root,path){
  if(!/^[a-zA-Z0-9./_-]+$/.test(path)||path.startsWith('/')||path.includes('..')||path.includes('\\'))return null;
  const target=resolve(root,path);
  if(target!==root&&!target.startsWith(root+sep))return null;
  return target;
}
export function auditSite(directory=resolve(ROOT,'site')){
  const errors=[];
  const fail=(label)=>errors.push(label);
  const contents=new Map();
  for(const name of FILES){
    const loc=safeLocalPath(directory,name);
    try{
      if(!loc||!lstatSync(loc).isFile()||lstatSync(loc).isSymbolicLink())throw Error('invalid');
      const bytes=readFileSync(loc);
      if(bytes.length>400_000)fail(`${name}: oversized`);
      const txt=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
      if(!txt.endsWith('\n')||txt.includes('\r')||txt.includes('\0'))fail(`${name}: bad encoding/line endings`);
      contents.set(name,txt);
    }catch{fail(`${name}: missing/unsafe/invalid UTF-8`);}
  }
  if(contents.size!==FILES.length)return errors;
  const html=contents.get('index.html'),css=contents.get('styles.css');
  const required=[[/^<!doctype html>/i,'doctype'],[/<html\s+lang="en">/,'document language'],[/<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1">/,'responsive viewport'],[/<title>HoriSift[^<]+<\/title>/,'nonempty page title'],[/<meta\s+name="description"/,'description'],[/http-equiv="Content-Security-Policy"[^>]*default-src 'none'/,'restrictive CSP'],[/<meta\s+name="referrer"\s+content="no-referrer">/,'privacy policy'],[/class="skip-link"\s+href="#main"/,'skip link'],[/<main\s+id="main">/,'main landmark'],[/<nav\s+class="nav"\s+aria-label="Main navigation">/,'navigation landmark'],[/<footer\s+class="footer">/,'footer landmark'],[/id="limitations"/,'limitations section'],[/issues\/1/,'known detector bug link'],[/not a claim of migration readiness/i,'specific evidence caveat'],[/not\s+proof of a Horizon-free application/i,'clear no-certification statement'],[/No published npm package yet/,'unpublished disclosure'],[/npm ci --ignore-scripts/,'real checkout install'],[/npm run cli -- scan/,'working scan command'],[/npm run example -- axelar-faucet/,'verified example invocation']];
  for(const [re,description] of required)if(!re.test(html))fail(`missing: ${description}`);
  if((html.match(/<h1\b/g)||[]).length!==1)fail('one h1 required');
  if((html.match(/<main\b/g)||[]).length!==1)fail('one main required');
  if((html.match(/<h2\b/g)||[]).length<4)fail('major sections lack headings');
  if(/<(script|iframe|form|object|embed|video|audio)\b|\bon\w+\s*=|javascript:|https?:\/\/(?:fonts\.googleapis|cdn\.|analytics\.)/i.test(html))fail('active or third-party embedded content');
  const ids=[...html.matchAll(/\bid="([A-Za-z][\w-]*)"/g)].map(m=>m[1]);
  if(new Set(ids).size!==ids.length)fail('duplicate ids');
  const anchors=[...html.matchAll(/<a\s+[^>]*href="[^"]+"[^>]*>/g)].map(m=>matchAttributes(m[0]));
  if(anchors.length<12)fail('insufficient navigation/link checks');
  for(const link of anchors){
    const href=link.href;
    if(href.startsWith('#')){if(!ids.includes(href.slice(1)))fail(`missing anchor: ${href}`);continue;}
    try{
      const u=new URL(href);
      if(u.protocol!=='https:'||u.username||u.password||!EXTERNAL.some(known=>href===known||href.startsWith(known+'/')))fail(`unapproved outbound URL: ${href}`);
      if(u.hostname==='github.com'&&u.pathname.startsWith('/HoriSift/HoriSift/blob/main/')){
        const file=u.pathname.slice('/HoriSift/HoriSift/blob/main/'.length);
        if(!safeLocalPath(ROOT,file)||!existsSync(resolve(ROOT,file)))fail(`broken repository link: ${file}`);
      }
    }catch{fail(`invalid external link: ${href}`);}
  }
  const images=[...html.matchAll(/<img\s+[^>]*>/g)].map(m=>matchAttributes(m[0]));
  if(images.length!==2)fail('brand mark/wordmark missing');
  for(const img of images){
    const asset=(img.src||'').replace(/^\.\//,'');
    if(!contents.has(asset)||!img.alt||!/^[1-9]\d*$/.test(img.width||'')||!/^[1-9]\d*$/.test(img.height||''))fail('broken/nonaccessible img '+asset);
  }
  for(const svgName of FILES.filter(x=>x.endsWith('.svg'))){
    const s=contents.get(svgName);
    if(!/<svg\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*viewBox="0 0 \d+ \d+"/.test(s)||!/<title\s+id="[\w-]+">[^<]+<\/title>/.test(s)||/<script\b|<foreignObject\b|onload=|<image\b|href="https?:/i.test(s))fail(`unsafe or inaccessible vector ${svgName}`);
  }
  if(/@import|url\(\s*["']?https?:|javascript:|expression\s*\(/i.test(css))fail('CSS requires remote/executable content');
  if(!css.includes('a:focus-visible')||!css.includes('.skip-link:focus')||!css.includes('prefers-reduced-motion:reduce'))fail('keyboard/reduced-motion CSS');
  if(!css.includes('@media(max-width:690px)')||!css.includes('@media(max-width:1050px)')||!css.includes('overflow-x:auto'))fail('responsive/tables CSS');
  const checks=[['main copy','#eff7ff','#071527',4.5],['muted copy','#b8c9d9','#071527',4.5],['primary button','#102219','#b7ef91',4.5],['code comment','#9eb5c9','#0a1828',4.5],['warning state','#ffe1aa','#54452e',4.5],['error state','#ffc3c1','#573537',4.5]];
  for(const [label,fg,bg,min] of checks)if(contrast(fg,bg)<min)fail(`insufficient ${label} contrast`);
  return errors;
}
export function compareBuiltSite(root=ROOT){
  const errors=[];
  for(const name of FILES){
    try{const source=readFileSync(resolve(root,'site',name)),built=readFileSync(resolve(root,'dist-site',name));if(!source.equals(built))errors.push(`modified build asset: ${name}`)}
    catch{errors.push(`missing build asset: ${name}`)}
  }
  return errors;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const errors=[...auditSite(),...compareBuiltSite()];
  if(errors.length){errors.slice(0,60).forEach(x=>console.error(x));process.exitCode=1;}
  else console.log('Static site: brand, a11y semantics, link targets, contrast, responsiveness, security and byte-identical build checked. Browser/axe audit is separate.');
}
