/** Narrow security-focused AST lint: not a replacement for a full ESLint rule set. */
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const BANNED_MODULES=new Set(['node:child_process','child_process','node:vm','vm','node:http','http','node:https','https','node:net','net','node:tls','tls','node:dns','dns','node:dgram','dgram']);
const BANNED_DIRECT=new Set(['eval','require','fetch']);
export function lintText(source,path='example.ts'){
  const faults=[];
  if(/@ts-ignore|@ts-nocheck|eslint-disable/.test(source)) faults.push('DISABLED_CHECKS');
  const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  if(ast.parseDiagnostics.length)faults.push('SYNTAX_ERROR');
  const check=(node)=>{
    if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)){
      const mod=node.moduleSpecifier.text;
      if(BANNED_MODULES.has(mod))faults.push('FORBIDDEN_MODULE');
      else if(!mod.startsWith('.')&&!mod.startsWith('node:')&&mod!=='typescript')faults.push('UNREVIEWED_DEPENDENCY');
    }
    if(ts.isCallExpression(node)){
      if(ts.isIdentifier(node.expression)&&BANNED_DIRECT.has(node.expression.text))faults.push('FORBIDDEN_CALL');
      if(node.expression.kind===ts.SyntaxKind.ImportKeyword)faults.push('DYNAMIC_IMPORT');
    }
    if(ts.isNewExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='Function')faults.push('FUNCTION_CONSTRUCTOR');
    ts.forEachChild(node,check);
  };
  check(ast);
  return [...new Set(faults)];
}
export function lintRepository(root,files){
  const failures=[];
  for(const path of files){const problems=lintText(readFileSync(resolve(root,path),'utf8'),path);for(const p of problems)failures.push(`${path}: ${p}`);}
  return failures;
}
const ownFile=fileURLToPath(import.meta.url);
if(process.argv[1]&&resolve(process.argv[1])===ownFile){
  const root=resolve(fileURLToPath(new URL('..', import.meta.url)));
  const {readdirSync}=await import('node:fs');
  const collect=(folder)=>readdirSync(resolve(root,folder),{withFileTypes:true}).flatMap(e=>e.isDirectory()?collect(folder+'/'+e.name):e.isFile()&&e.name.endsWith('.ts')?[folder+'/'+e.name]:[]);
  const problems=lintRepository(root,collect('src'));
  if(problems.length){for(const p of problems.slice(0,50))console.error(p);process.exitCode=1;}
  else console.log('Source AST lint: no disabled checks, dynamic imports, eval, or network/process execution.');
}
