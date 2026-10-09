/**
 * Conservative syntax-bound Horizon dependency detector.
 * Does not execute or import source from inspected projects. Findings are evidence
 * of source dependencies, never claims about available RPC replacements.
 */
import ts from 'typescript';
import { extname } from 'node:path';
import { parseSource, type Location } from '../parser/parse.ts';
import { discoverSourceFiles, type DiscoveryOptions } from '../scanner/discover.ts';
import { readSourceFile } from '../parser/read.ts';

export type HorizonKind = 'sdk-client' | 'sdk-call' | 'http-call' | 'stream' | 'response-shape';
export interface HorizonFinding { kind: HorizonKind; pattern: string; location: Location; }
export interface HorizonUnknown { code: 'DYNAMIC_HORIZON_URL' | 'DYNAMIC_HTTP_URL' | 'DYNAMIC_HORIZON_CALL' | 'MUTABLE_SDK_BINDING' | 'DYNAMIC_HTTP_METHOD'; location: Location; message: string; }
export interface HorizonDetection { file: string; status: 'complete' | 'incomplete'; findings: HorizonFinding[]; unknowns: HorizonUnknown[]; diagnostics: {code: string; file: string | null; message: string}[]; }
export interface HorizonRepositoryDetection { root: '.'; status: 'complete' | 'incomplete'; summary: { filesInspected: number; findings: number; unknowns: number; diagnostics: number }; findings: HorizonFinding[]; unknowns: HorizonUnknown[]; diagnostics: {code: string; file: string | null; message: string}[]; }

type Value = 'unknown'|'sdk'|'horizon'|'server'|'client'|'builder'|'httpResponse'|'httpPayload'|'axios'|'axiosResponse'|'sdkPage';
interface Binding { initializer?: ts.Expression | undefined; literal?: Value; propertyOf?: { source: ts.Expression; key: string }; declaration: ts.Node; mutable: boolean; mutated: boolean; }
interface Scope { parent?: Scope; bindings: Map<string, Binding>; }
const SDK_NAMES = new Set(['@stellar/stellar-sdk', 'stellar-sdk']);
const BUILDER_METHODS = new Set(['forAccount','forLedger','forTransaction','forOperation','cursor','limit','order','join','includeFailed','forClaimableBalance','forLiquidityPool','forOffer']);
const COLLECTIONS = new Set(['accounts','payments','operations','effects','transactions','ledgers','offers','trades','claimableBalances','liquidityPools','assets','orderbook','strictReceivePaths','strictSendPaths','tradeAggregation','friendbot']);
const DIRECT_SDK = new Set(['loadAccount','submitTransaction','submitAsyncTransaction','feeStats','fetchBaseFee','root','fetchTimebounds','checkMemoRequired']);
const ROOT_HOSTS = new Set(['horizon.stellar.org','horizon-testnet.stellar.org','horizon-futurenet.stellar.org']);
const EXT = new Map([['.js',ts.ScriptKind.JS],['.mjs',ts.ScriptKind.JS],['.cjs',ts.ScriptKind.JS],['.jsx',ts.ScriptKind.JSX],['.ts',ts.ScriptKind.TS],['.mts',ts.ScriptKind.TS],['.cts',ts.ScriptKind.TS],['.tsx',ts.ScriptKind.TSX]]);
const order=(a:string,b:string):number=>a<b?-1:a>b?1:0;
const isScope=(n:ts.Node):boolean=>ts.isSourceFile(n)||ts.isBlock(n)||ts.isFunctionLike(n)||ts.isCatchClause(n);
const unwrap=(e:ts.Expression):ts.Expression=>{
  let v=e;
  while(ts.isParenthesizedExpression(v)||ts.isAsExpression(v)||ts.isTypeAssertionExpression(v)||ts.isNonNullExpression(v)||ts.isSatisfiesExpression(v)||ts.isAwaitExpression(v)) v=v.expression;
  return v;
};
const name=(p:ts.PropertyName):string|null=>ts.isIdentifier(p)||ts.isStringLiteral(p)?p.text:null;
const literal=(e:ts.Expression):string|null=>{const v=unwrap(e);return ts.isStringLiteral(v)||ts.isNoSubstitutionTemplateLiteral(v)?v.text:null;};
const access=(e:ts.Expression):{receiver:ts.Expression;property:string}|null=>{
  const v=unwrap(e);
  if(ts.isPropertyAccessExpression(v))return {receiver:v.expression,property:v.name.text};
  if(ts.isElementAccessExpression(v)&&v.argumentExpression){const p=literal(v.argumentExpression);return p===null?null:{receiver:v.expression,property:p};}
  return null;
};
const objectValue=(obj:ts.Expression,key:string):ts.Expression|null=>{
  const v=unwrap(obj);
  if(!ts.isObjectLiteralExpression(v))return null;
  for(const p of v.properties){if(ts.isPropertyAssignment(p)&&name(p.name)===key)return p.initializer;}
  return null;
};
function route(p:string):string{
  const segments=p.split('/').filter(Boolean).slice(0,5);
  if(!segments.length)return '/';
  const collection=segments[0];
  if(!/^(accounts|payments|effects|operations|transactions|ledgers|offers|trades|claimable_balances|liquidity_pools|fee_stats|assets|order_book)$/.test(collection!))return '/:other';
  return '/'+segments.map((s,i)=>i===0?s:i%2===1?':id':/^(payments|operations|transactions|effects|trades|offers|data)$/.test(s!)?s:':part').join('/');
}
function horizonAddress(value:string):{route:string}|null{
  try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||!ROOT_HOSTS.has(u.hostname.toLowerCase()))return null;return {route:route(u.pathname)};}catch{return null;}
}
const incompleteMessage:Record<HorizonUnknown['code'],string>={
  DYNAMIC_HORIZON_URL:'Horizon client URL is dynamic and needs manual inspection.',
  DYNAMIC_HTTP_URL:'Potential Horizon HTTP address is dynamic and cannot be verified.',
  DYNAMIC_HORIZON_CALL:'Horizon request uses a computed method name that cannot be verified.',
  MUTABLE_SDK_BINDING:'A Stellar SDK-related binding is reassigned or mutated; its identity is unverified.',
  DYNAMIC_HTTP_METHOD:'Horizon HTTP request method is dynamic or otherwise unknown.',
};

export function detectHorizonUsage(file:string,source:string):HorizonDetection{
  const parsed=parseSource(file,source);
  const result:HorizonDetection={file,status:parsed.status,findings:[],unknowns:[],diagnostics:parsed.diagnostics.map(d=>({code:d.code,file:d.file,message:d.message}))};
  const ext=extname(file).toLowerCase();
  if(parsed.status==='incomplete'||!EXT.has(ext))return result;
  const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,EXT.get(ext)!);
  const location=(n:ts.Node):Location=>{
    const a=ast.getLineAndCharacterOfPosition(n.getStart(ast));const b=ast.getLineAndCharacterOfPosition(n.getEnd());
    return {file,start:{line:a.line+1,column:a.character+1},end:{line:b.line+1,column:b.character+1}};
  };
  const root:Scope={bindings:new Map()};const scopeByNode=new Map<ts.Node,Scope>();
  const declare=(scope:Scope,id:string,value:Binding):void=>{scope.bindings.set(id,value);};
  const binding=(scope:Scope,id:string):Binding|undefined=>{let p:Scope|undefined=scope;while(p){const found=p.bindings.get(id);if(found)return found;p=p.parent;}return undefined;};
  const bindPattern=(pattern:ts.BindingName,scope:Scope,decl:ts.Node,mutable:boolean):void=>{
    if(ts.isIdentifier(pattern))declare(scope,pattern.text,{declaration:decl,mutable,mutated:false,initializer:ts.isVariableDeclaration(decl)?decl.initializer:undefined});
    else for(const item of pattern.elements){if(ts.isOmittedExpression(item))continue;bindPattern(item.name,scope,decl,mutable);}
  };
  function prepare(n:ts.Node, scope:Scope):void{
    scopeByNode.set(n,scope);
    if(ts.isImportDeclaration(n)&&ts.isStringLiteral(n.moduleSpecifier)&&n.importClause){
      const module=n.moduleSpecifier.text;const c=n.importClause;
      const declareImport=(local:string,val:Value,node:ts.Node):void=>declare(scope,local,{literal:val,declaration:node,mutable:false,mutated:false});
      if(c.name)declareImport(c.name.text,!c.isTypeOnly&&module==='axios'?'axios':'unknown',c.name);
      const bindings=c.namedBindings;
      if(bindings&&ts.isNamespaceImport(bindings))declareImport(bindings.name.text,SDK_NAMES.has(module)&&!c.isTypeOnly?'sdk':'unknown',bindings.name);
      if(bindings&&ts.isNamedImports(bindings))for(const el of bindings.elements){
        const imported=el.propertyName?.text??el.name.text;
        declareImport(el.name.text,SDK_NAMES.has(module)&&imported==='Horizon'&&!el.isTypeOnly&&!c.isTypeOnly?'horizon':module==='axios'&&imported==='default'&&!c.isTypeOnly?'axios':'unknown',el.name);
      }
    }
    if(ts.isImportEqualsDeclaration(n)){
      const e=n.moduleReference;
      const val=ts.isExternalModuleReference(e)&&e.expression&&ts.isStringLiteral(e.expression)&&SDK_NAMES.has(e.expression.text)?'sdk':'unknown';
      declare(scope,n.name.text,{literal:val,declaration:n,mutable:false,mutated:false});
    }
    if(ts.isVariableDeclaration(n)){
      const mutable=!(n.parent.flags & ts.NodeFlags.Const);
      bindPattern(n.name,scope,n,mutable);
      if(ts.isObjectBindingPattern(n.name)&&n.initializer){
        for(const item of n.name.elements){
          const k=item.propertyName?name(item.propertyName):ts.isIdentifier(item.name)?item.name.text:null;
          if(k&&ts.isIdentifier(item.name))declare(scope,item.name.text,{propertyOf:{source:n.initializer,key:k},declaration:n,mutable,mutated:false});
        }
      }
      // Destructuring is supported only for the exact SDK module require call.
      const init=n.initializer?unwrap(n.initializer):null;
      if(init&&ts.isCallExpression(init)&&ts.isIdentifier(init.expression)&&init.expression.text==='require'&&!binding(scope,'require')&&init.arguments.length===1&&ts.isStringLiteral(init.arguments[0]!)){
        const mod=init.arguments[0]!.text;
        if(ts.isIdentifier(n.name)&&SDK_NAMES.has(mod))declare(scope,n.name.text,{literal:'sdk',declaration:n,mutable:!(n.parent.flags&ts.NodeFlags.Const),mutated:false});
        if(ts.isIdentifier(n.name)&&mod==='axios')declare(scope,n.name.text,{literal:'axios',declaration:n,mutable:!(n.parent.flags&ts.NodeFlags.Const),mutated:false});
        if(ts.isObjectBindingPattern(n.name))for(const item of n.name.elements){
          const original=item.propertyName?name(item.propertyName):ts.isIdentifier(item.name)?item.name.text:null;
          if(ts.isIdentifier(item.name))declare(scope,item.name.text,{literal:SDK_NAMES.has(mod)&&original==='Horizon'?'horizon':'unknown',declaration:item,mutable:!(n.parent.flags&ts.NodeFlags.Const),mutated:false});
        }
      }
    }
    if(ts.isFunctionLike(n)){
      // Function names are bound in their lexical parent; parameters live in body scope.
      if('name' in n && n.name&&ts.isIdentifier(n.name))declare(scope,n.name.text,{literal:'unknown',declaration:n,mutable:true,mutated:false});
    }
    if(ts.isClassDeclaration(n)&&n.name)declare(scope,n.name.text,{literal:'unknown',declaration:n,mutable:false,mutated:false});
  }
  // Construct lexical scopes in two passes so shadowing is respected even before declarations.
  const makeScopes=(node:ts.Node,parent:Scope):void=>{
    const self=node===ast?root:isScope(node)?{parent,bindings:new Map<string,Binding>()}:parent;
    scopeByNode.set(node,self);
    ts.forEachChild(node,child=>makeScopes(child,self));
  };
  makeScopes(ast,root);
  const walkDecl=(node:ts.Node):void=>{
    const s=scopeByNode.get(node)!;
    if(ts.isImportDeclaration(node)||ts.isImportEqualsDeclaration(node)||ts.isVariableDeclaration(node)||ts.isFunctionLike(node)||ts.isClassDeclaration(node)){
      // Imports and variables bind in containing lexical context, not nested function scope.
      let declScope=(ts.isFunctionLike(node)||ts.isClassDeclaration(node))?scopeByNode.get(node.parent)??s:s;
      if(ts.isVariableDeclaration(node)&&!(node.parent.flags&(ts.NodeFlags.Const|ts.NodeFlags.Let))){
        let ancestor:ts.Node|undefined=node.parent;
        while(ancestor&&!ts.isFunctionLike(ancestor)&&!ts.isSourceFile(ancestor))ancestor=ancestor.parent;
        if(ancestor)declScope=scopeByNode.get(ancestor)??s;
      }
      prepare(node,declScope);
    }
    if(ts.isFunctionLike(node))for(const p of node.parameters)bindPattern(p.name,s,p,true);
    if(ts.isCatchClause(node)&&node.variableDeclaration)bindPattern(node.variableDeclaration.name,s,node.variableDeclaration,true);
    ts.forEachChild(node,walkDecl);
  };walkDecl(ast);
  // Track assignment to a bound name, including property mutation conservatively.
  const markMutable=(node:ts.Node):void=>{
    const s=scopeByNode.get(node)!;
    if(ts.isBinaryExpression(node)&&node.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&node.operatorToken.kind<=ts.SyntaxKind.LastAssignment){
      const lhs=unwrap(node.left);
      const base=(x:ts.Expression):ts.Identifier|null=>{const v=unwrap(x);if(ts.isIdentifier(v))return v;const m=access(v);return m?base(m.receiver):null;};
      const id=base(lhs);if(id){const b=binding(s,id.text);if(b)b.mutated=true;}
    }
    if(ts.isPrefixUnaryExpression(node)||ts.isPostfixUnaryExpression(node))if(node.operator===ts.SyntaxKind.PlusPlusToken||node.operator===ts.SyntaxKind.MinusMinusToken){const v=unwrap(node.operand);if(ts.isIdentifier(v)){const b=binding(s,v.text);if(b)b.mutated=true;}}
    ts.forEachChild(node,markMutable);
  };markMutable(ast);
  const sdkNames=new Set(['sdk','horizon','server','client','builder','sdkPage']);
  const unknownKeys=new Set<string>();const findingKeys=new Set<string>();
  const addUnknown=(code:HorizonUnknown['code'],node:ts.Node):void=>{
    const loc=location(node),key=`${code}:${loc.start.line}:${loc.start.column}`;
    if(!unknownKeys.has(key)){unknownKeys.add(key);result.unknowns.push({code,location:loc,message:incompleteMessage[code]});result.status='incomplete';}
  };
  const add=(kind:HorizonKind,pattern:string,node:ts.Node):void=>{
    const loc=location(node),key=`${kind}:${pattern}:${loc.start.line}:${loc.start.column}`;
    if(!findingKeys.has(key)){findingKeys.add(key);result.findings.push({kind,pattern,location:loc});}
  };
  const staticString=(node:ts.Expression,scope:Scope,seen=new Set<Binding>()):string|null=>{
    if(seen.size>48)return null;const n=unwrap(node);const v=literal(n);if(v!==null)return v;
    if(ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.PlusToken){const left=staticString(n.left,scope,seen);const right=staticString(n.right,scope,seen);return left!==null&&right!==null&&left.length+right.length<=4096?left+right:null;}
    if(ts.isIdentifier(n)){const b=binding(scope,n.text);if(!b||b.mutable||b.mutated||!b.initializer||seen.has(b))return null;seen.add(b);const val=staticString(b.initializer,scopeByNode.get(b.declaration)??scope,seen);seen.delete(b);return val;}
    return null;
  };
  const mayBeHorizon=(e:ts.Expression,scope:Scope,seen=new Set<Binding>()):boolean=>{
    if(seen.size>48)return false;const n=unwrap(e);const constant=literal(n);if(constant!==null&&/horizon/i.test(constant))return true;const txt=ts.isIdentifier(n)?n.text:access(n)?.property??'';
    if(/horizon/i.test(txt))return true;
    if(ts.isBinaryExpression(n))return mayBeHorizon(n.left,scope,seen)||mayBeHorizon(n.right,scope,seen);
    if(ts.isTemplateExpression(n))return n.head.text.toLowerCase().includes('horizon')||n.templateSpans.some(t=>t.literal.text.toLowerCase().includes('horizon')||mayBeHorizon(t.expression,scope,seen));
    if(ts.isNewExpression(n)||ts.isCallExpression(n))return !!n.arguments?.some(x=>mayBeHorizon(x,scope,seen));
    if(ts.isIdentifier(n)){const b=binding(scope,n.text);if(b?.initializer&&!seen.has(b)){seen.add(b);const val=mayBeHorizon(b.initializer,scopeByNode.get(b.declaration)??scope,seen);seen.delete(b);return val;}}
    return false;
  };
  const resolve=(expr:ts.Expression,scope:Scope,stack=new Set<Binding>()):Value=>{
    if(stack.size>48)return 'unknown';const e=unwrap(expr);
    if(ts.isIdentifier(e)){
      const b=binding(scope,e.text);if(!b)return 'unknown';
      if(b.mutated||b.mutable)return 'unknown';
      if(b.literal)return b.literal;
      if(b.propertyOf){if(stack.has(b))return 'unknown';stack.add(b);const v=resolve(b.propertyOf.source,scopeByNode.get(b.declaration)??scope,stack);stack.delete(b);return v==='sdk'&&b.propertyOf.key==='Horizon'?'horizon':'unknown';}
      if(!b.initializer||stack.has(b))return 'unknown';
      stack.add(b);const val=resolve(b.initializer,scopeByNode.get(b.declaration)??scope,stack);stack.delete(b);return val;
    }
    const m=access(e);
    if(m){const recv=resolve(m.receiver,scope,stack);
      if(recv==='sdk'&&m.property==='Horizon')return 'horizon';
      if(recv==='horizon'&&m.property==='Server')return 'server';
      if(recv==='axiosResponse'&&m.property==='data')return 'httpPayload';
      return 'unknown';}
    if(ts.isNewExpression(e)){const v=resolve(e.expression,scope,stack);return v==='server'?'client':'unknown';}
    if(ts.isCallExpression(e)){
      const c=access(e.expression);if(c){const receiver=resolve(c.receiver,scope,stack);
        if(receiver==='client'&&COLLECTIONS.has(c.property))return 'builder';
        if(receiver==='builder'&&BUILDER_METHODS.has(c.property))return 'builder';
        if(receiver==='builder'&&c.property==='call')return 'sdkPage';
        if(receiver==='httpResponse'&&c.property==='json')return 'httpPayload';
        if(receiver==='axios'&&['get','post','put','delete'].includes(c.property)){const arg=e.arguments[0];const addr=arg&&staticString(arg,scope);return addr&&horizonAddress(addr)?'axiosResponse':'unknown';}
      }
      if(ts.isIdentifier(e.expression)&&e.expression.text==='fetch'&&!binding(scope,'fetch')){const arg=e.arguments[0];const addr=arg&&staticString(arg,scope);return addr&&horizonAddress(addr)?'httpResponse':'unknown';}
    }
    return 'unknown';
  };
  // Resolving an SDK client cannot confer authority on unrelated objects. Check
  // concrete constructor identity and immutable lexical bindings before recording.
  const inspect=(node:ts.Node):void=>{
    const scope=scopeByNode.get(node)!;
    if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)){
      const b=binding(scope,node.name.text);
      if(b&&(b.mutable||b.mutated)&&(b.literal==='sdk'||b.literal==='horizon'||(b.initializer&&sdkNames.has(resolve(b.initializer,scope)))))addUnknown('MUTABLE_SDK_BINDING',node.name);
    }
    if(ts.isNewExpression(node)&&resolve(node.expression,scope)==='server'){
      add('sdk-client','sdk.Horizon.Server',node.expression);
      const arg=node.arguments?.[0];if(arg&&!staticString(arg,scope))addUnknown('DYNAMIC_HORIZON_URL',arg);
    }
    if(ts.isCallExpression(node)){
      const member=access(node.expression);
      if(member){
        const receiver=resolve(member.receiver,scope);
        if(receiver==='client'&&(COLLECTIONS.has(member.property)||DIRECT_SDK.has(member.property)))add('sdk-call',`sdk.Horizon.Server.${member.property}`,node.expression);
        if(receiver==='builder'&&member.property==='stream')add('stream','sdk.Horizon.stream',node.expression);
        if(receiver==='client'&&!COLLECTIONS.has(member.property)&&!DIRECT_SDK.has(member.property)){ 
          // Non-listed methods may still be legitimate; leave unknown rather than fabricate a finding.
        }
      }
      if(ts.isElementAccessExpression(unwrap(node.expression))){const el=unwrap(node.expression) as ts.ElementAccessExpression;
        if(!literal(el.argumentExpression)&&['client','builder'].includes(resolve(el.expression,scope)))addUnknown('DYNAMIC_HORIZON_CALL',node.expression);
      }
      let address:ts.Expression|null=null,verb:string|null=null;
      const target=unwrap(node.expression);
      if(ts.isIdentifier(target)&&target.text==='fetch'&&!binding(scope,'fetch')){address=node.arguments[0]??null;verb='GET';}
      if(member?.property==='fetch'&&ts.isIdentifier(unwrap(member.receiver))&&(unwrap(member.receiver) as ts.Identifier).text==='globalThis'&&!binding(scope,'globalThis')){address=node.arguments[0]??null;verb='GET';}
      if(member&&['get','post','put','delete'].includes(member.property)&&resolve(member.receiver,scope)==='axios'){
        address=node.arguments[0]??null;verb=member.property.toUpperCase();
      }
      if(address&&verb){const raw=staticString(address,scope);const known=raw!==null?horizonAddress(raw):null;
        if(verb==='GET'&&(!member||member.property==='fetch')&&node.arguments.length>1){
          const cfg=unwrap(node.arguments[1]!);const method=objectValue(cfg,'method');
          if(!ts.isObjectLiteralExpression(cfg)||method){
            const text=method?staticString(method,scope):null;
            if(text&&/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/i.test(text))verb=text.toUpperCase();
            else{verb='UNKNOWN';if(known)addUnknown('DYNAMIC_HTTP_METHOD',node.arguments[1]!);}
          }
        }
        if(known)add('http-call',`http.${verb}.${known.route}`,node.expression);
        else if(raw===null&&mayBeHorizon(address,scope))addUnknown('DYNAMIC_HTTP_URL',address);
      }
    }
    if(ts.isPropertyAccessExpression(node)&&node.name.text==='records'){
      const obj=access(node.expression);
      if(obj?.property==='_embedded'&&resolve(obj.receiver,scope)==='httpPayload')add('response-shape','http.HAL._embedded.records',node);
      if(resolve(node.expression,scope)==='sdkPage')add('response-shape','sdk.Horizon.records',node);
    }
    ts.forEachChild(node,inspect);
  };inspect(ast);
  const cmp=(a:Location,b:Location):number=>order(a.file,b.file)||a.start.line-b.start.line||a.start.column-b.start.column;
  result.findings.sort((a,b)=>cmp(a.location,b.location)||order(a.kind,b.kind)||order(a.pattern,b.pattern));
  result.unknowns.sort((a,b)=>cmp(a.location,b.location)||order(a.code,b.code));
  return result;
}

/** No CLI: testable orchestration of discovery, safe reads and AST evidence. */
export async function detectHorizonRepository(rootPath:string,options:DiscoveryOptions={}):Promise<HorizonRepositoryDetection>{
  const discovered=await discoverSourceFiles(rootPath,options);
  const result:HorizonRepositoryDetection={root:'.',status:discovered.status,summary:{filesInspected:0,findings:0,unknowns:0,diagnostics:0},findings:[],unknowns:[],diagnostics:discovered.diagnostics.map(x=>({code:x.code,file:x.file,message:x.message}))};
  for(const entry of discovered.files){
    const read=await readSourceFile(rootPath,entry.path,options.limits?.maxFileBytes === undefined ? {} : {maxFileBytes:options.limits.maxFileBytes});
    if(read.status!=='ok'){result.status='incomplete';result.diagnostics.push({code:read.diagnostic.code,file:read.diagnostic.file,message:read.diagnostic.message});continue;}
    result.summary.filesInspected++;
    const detected=detectHorizonUsage(entry.path,read.source);
    if(detected.status==='incomplete')result.status='incomplete';
    result.findings.push(...detected.findings);result.unknowns.push(...detected.unknowns);result.diagnostics.push(...detected.diagnostics);
  }
  const sorted=(a:{location:Location},b:{location:Location}):number=>order(a.location.file,b.location.file)||a.location.start.line-b.location.start.line||a.location.start.column-b.location.start.column;
  result.findings.sort((a,b)=>sorted(a,b)||order(a.kind,b.kind)||order(a.pattern,b.pattern));
  result.unknowns.sort((a,b)=>sorted(a,b)||order(a.code,b.code));
  result.diagnostics.sort((a,b)=>order(a.file??'',b.file??'')||order(a.code,b.code));
  result.summary.findings=result.findings.length;result.summary.unknowns=result.unknowns.length;result.summary.diagnostics=result.diagnostics.length;
  return result;
}
