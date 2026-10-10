/** Supply-chain and workflow policy checks, independent of online npm audit. */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const CHECKOUT='11d5960a326750d5838078e36cf38b85af677262';
const SETUP_NODE='49933ea5288caeca8642d1e84afbd3f7d6820020';
export function validateWorkflow(workflow){
  const faults=[];
  if(!workflow.includes(`actions/checkout@${CHECKOUT}`)||!workflow.includes(`actions/setup-node@${SETUP_NODE}`))faults.push('UNPINNED_ACTION');
  for(const found of workflow.matchAll(/\buses:\s*([^\s#]+)/g)){
    if(!/^actions\/(?:checkout|setup-node)@[a-f0-9]{40}$/.test(found[1]))faults.push('UNREVIEWED_ACTION');
  }
  if(!/^permissions:\s*\n\s+contents: read\s*$/m.test(workflow))faults.push('PERMISSIONS_NOT_RESTRICTED');
  if(/pull_request_target|workflow_run|persist-credentials:\s*true|self-hosted|continue-on-error:\s*true/.test(workflow))faults.push('UNSAFE_WORKFLOW_FEATURE');
  if(!workflow.includes('npm ci --ignore-scripts'))faults.push('UNSAFE_INSTALL');
  if(!workflow.includes('npm audit --audit-level=high'))faults.push('NO_DEPENDENCY_AUDIT');
  if(!workflow.includes('npm run verify:gates'))faults.push('NO_NEGATIVE_GATE_CHECK');
  return [...new Set(faults)];
}
export function validatePackageLock(pkg,lock){
  const problems=[];
  if(pkg.private!==true||pkg.name!=='horisift')problems.push('PUBLIC_OR_UNEXPECTED_PACKAGE');
  if(lock.name!==pkg.name||lock.version!==pkg.version)problems.push('LOCK_MISMATCH');
  if(JSON.stringify(pkg.dependencies)!==JSON.stringify(lock.packages?.['']?.dependencies)||JSON.stringify(pkg.devDependencies)!==JSON.stringify(lock.packages?.['']?.devDependencies))problems.push('DEPENDENCY_LOCK_DRIFT');
  for(const [name,meta] of Object.entries(lock.packages??{})){
    if(name==='')continue;
    if(typeof meta.version!=='string'||!/^[0-9]+\.[0-9]+\.[0-9]+/.test(meta.version)||typeof meta.integrity!=='string'||!meta.integrity.startsWith('sha512-')||!/^https:\/\/registry\.npmjs\.org\//.test(meta.resolved??''))problems.push('UNVERIFIED_PACKAGE');
  }
  if(!Object.values(pkg.dependencies??{}).every(v=>/^\d+\.\d+\.\d+$/.test(v)))problems.push('RUNTIME_DEPENDENCY_NOT_PINNED');
  return [...new Set(problems)];
}
const own=fileURLToPath(import.meta.url);
if(process.argv[1]&&resolve(process.argv[1])===own){
  const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
  const read=name=>readFileSync(resolve(root,name),'utf8');
  const errors=[...validateWorkflow(read('.github/workflows/foundation.yml')),...validatePackageLock(JSON.parse(read('package.json')),JSON.parse(read('package-lock.json')))];
  if(errors.length){for(const v of errors)console.error(v);process.exitCode=1;}
  else console.log('Workflow/lock supply-chain policy validated (not a vulnerability audit).');
}
