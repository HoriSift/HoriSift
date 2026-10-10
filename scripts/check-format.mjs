/** Minimal, dependency-free repository formatting policy. Not a full formatter. */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const INCLUDED = new Set(['.ts', '.mjs', '.json', '.yml', '.yaml']);
const FOLDERS = ['src', 'scripts', 'bin', '.github', 'schemas', 'tests'];
const ROOT_FILES = ['package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.build.json'];
const SKIP = new Set(['node_modules', 'dist', '.git', 'coverage', 'golden']);
export function validateText(text, filename) {
  const faults=[];
  if (text.startsWith('\ufeff')) faults.push('BOM');
  if (text.includes('\r')) faults.push('CRLF');
  if (!text.endsWith('\n')) faults.push('MISSING_FINAL_LF');
  if (text.includes('\t')) faults.push('TAB');
  if (/[^\S\n]+$/m.test(text)) faults.push('TRAILING_WHITESPACE');
  if (/\x00/.test(text)) faults.push('NUL');
  if (filename.endsWith('.json')) {
    try { JSON.parse(text); } catch { faults.push('INVALID_JSON'); }
  }
  return faults;
}
export function collectFiles(root) {
  const files = [...ROOT_FILES];
  const walk=(path)=>{
    let entries;
    try { entries=readdirSync(resolve(root,path),{withFileTypes:true}); }
    catch { throw new Error('Missing formatting scope: '+path); }
    for (const item of entries) {
      const next=join(path,item.name);
      if (item.isDirectory()&&!SKIP.has(item.name))walk(next);
      else if (item.isFile()&&INCLUDED.has(item.name.slice(item.name.lastIndexOf('.'))))files.push(next);
    }
  };
  for(const dir of FOLDERS)walk(dir);
  return files.sort((a,b)=>a<b?-1:a>b?1:0);
}
export function checkFormat(root, files=collectFiles(root)) {
  const failures=[];
  for(const path of files){
    try {
      const bytes=readFileSync(resolve(root,path));
      const decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
      for(const error of validateText(decoded,path))failures.push(`${path}: ${error}`);
    } catch {failures.push(`${path}: UNREADABLE_OR_INVALID_UTF8`);}
  }
  return failures;
}
const here=resolve(fileURLToPath(new URL('..', import.meta.url)));
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const failures=checkFormat(here);
  if(failures.length){for(const f of failures.slice(0,50))console.error(f);process.exitCode=1;}
  else console.log('Formatting policy: source/scripts/tests JSON and whitespace OK.');
}
