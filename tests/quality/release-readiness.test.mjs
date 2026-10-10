import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { evaluateReadiness, run, REQUIRED_GATES } from '../../scripts/release-readiness.mjs';
const root = fileURLToPath(new URL('../..', import.meta.url));
const evidence = JSON.parse(readFileSync(new URL('../../docs/RELEASE_READINESS.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const change = f => f(JSON.parse(JSON.stringify(evidence)));
test('release preflight explicitly holds because five required checks are open', () => {
  const result = evaluateReadiness(evidence, manifest);
  assert.equal(result.decision, 'HOLD');
  assert.equal(result.released, false);
  assert.deepEqual(result.blockers.map(x => x.id), REQUIRED_GATES.slice(1));
});
test('private npm flag is non-negotiable for this unpublished review', () => {
  assert.throws(() => evaluateReadiness(evidence, { ...manifest, private:false }), /private npm candidate/);
});
test('only fixed repository and documented candidate version are admissible', () => {
  assert.throws(() => evaluateReadiness(change(e=>{e.repository='other/repo';return e;}),manifest));
  assert.throws(() => evaluateReadiness(change(e=>{e.candidateVersion='99.0';return e;}),manifest));
});
test('a fabricated green CI URL is not accepted without appropriate origin',()=>{
  assert.throws(()=>evaluateReadiness(change(e=>{e.verifiedCandidateCi='https://example.org/great';return e;}),manifest));
});
test('public npm, GitHub release and site remain explicitly unpublished',()=>{
  for(const key of ['npmPublished','githubReleaseCreated','siteDeployed']) assert.throws(()=>evaluateReadiness(change(e=>{e.publication[key]=true;return e;}),manifest));
});
test('maintainer screenshot records submission pending review, never organizer approval',()=>{
  const result=evaluateReadiness(evidence,manifest);
  assert.equal(result.decision,'HOLD');
  assert.deepEqual(result.waveApplication,{
    submitted:true,status:'pending-review',evidenceKind:'user-provided screenshot',organizerApproved:false
  });
  assert.match(result.statement,/pending organizer review/);
});
test('submission record cannot fabricate acceptance or omit screenshot provenance',()=>{
  for(const value of ['approved','accepted','not-submitted','']) {
    assert.throws(()=>evaluateReadiness(change(e=>{e.publication.waveApplicationStatus=value;return e;}),manifest),/wave review status/);
  }
  assert.throws(()=>evaluateReadiness(change(e=>{e.publication.waveApplicationEvidence=null;return e;}),manifest),/wave submission evidence/);
  assert.throws(()=>evaluateReadiness(change(e=>{e.publication.waveApplicationSubmitted=false;return e;}),manifest),/wave review status/);
});
test('missing check, duplicate check, and rogue ID are refused',()=>{
  assert.throws(()=>evaluateReadiness(change(e=>{e.checks.pop();return e;}),manifest));
  assert.throws(()=>evaluateReadiness(change(e=>{e.checks[0].id=e.checks[1].id;return e;}),manifest));
  assert.throws(()=>evaluateReadiness(change(e=>{e.checks[0].id='automatic-publish';return e;}),manifest));
});
test('verified requires an evidence URL; unverified cannot be made into success via missing proof',()=>{
  assert.throws(()=>evaluateReadiness(change(e=>{e.checks[1].status='verified';e.checks[1].evidence=null;return e;}),manifest));
  assert.throws(()=>evaluateReadiness(change(e=>{e.checks[2].evidence='file:///private';return e;}),manifest));
});
test('malformed check states and injected control characters are invalid',()=>{
  assert.throws(()=>evaluateReadiness(change(e=>{e.checks[1].status='approved';return e;}),manifest));
  assert.throws(()=>evaluateReadiness(change(e=>{e.checks[1].note='evil\nnewline';return e;}),manifest));
});
test('success-shaped synthetic checklist never claims a publication or approval',()=>{
  const result=evaluateReadiness(change(e=>{for(const c of e.checks){c.status='verified';c.evidence??='https://github.com/HoriSift/HoriSift/issues/1';}return e;}),manifest);
  assert.equal(result.decision,'REVIEW_READY_NOT_RELEASED');
  assert.equal(result.released,false);
  assert.match(result.statement,/no release/);
});
test('default CLI intentionally exits nonzero when HOLD; expected-HOLD CI check passes',()=>{
  const script=fileURLToPath(new URL('../../scripts/release-readiness.mjs',import.meta.url));
  const a=spawnSync(process.execPath,[script],{encoding:'utf8',cwd:root});
  assert.equal(a.status,2,a.stderr);assert.equal(JSON.parse(a.stdout).decision,'HOLD');
  const b=spawnSync(process.execPath,[script,'--expect-hold'],{encoding:'utf8',cwd:root});
  assert.equal(b.status,0,b.stderr);assert.equal(JSON.parse(b.stdout).decision,'HOLD');
});
test('invalid option cannot invoke any publishing operation',()=>{
  const output={stdout:[],stderr:[]};
  assert.equal(run(['--publish'],{stdout:{write:x=>output.stdout.push(x)},stderr:{write:x=>output.stderr.push(x)}}),3);
  assert.equal(output.stdout.length,0);assert.match(output.stderr.join(''),/Usage/);
});
