/** A local, advisory evidence gate. Never authenticates approvals or publishes anything. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const EVIDENCE_FILE = new URL('../docs/RELEASE_READINESS.json', import.meta.url);
export const REQUIRED_GATES = Object.freeze([
  'candidate-install', 'historical-sdk-coverage', 'full-repository-accuracy',
  'security-schema-review', 'maintainer-authorization', 'wave-policy-review',
]);
const SHA = /^[0-9a-f]{40}$/;
const ID = /^[a-z][a-z0-9-]{2,79}$/;
const validUrl = x => typeof x === 'string' && x.startsWith('https://') &&
  !/[\s<>\\]/.test(x) && x.length < 1000;

function assert(condition, label) {
  if (!condition) throw new TypeError(`Invalid release-readiness evidence: ${label}`);
}

/** Only states are reported; neither this script nor its JSON input grants approval. */
export function evaluateReadiness(evidence, manifest) {
  assert(evidence && typeof evidence === 'object' && !Array.isArray(evidence), 'object');
  assert(evidence.schemaVersion === '1.0.0', 'schemaVersion');
  assert(evidence.repository === 'HoriSift/HoriSift', 'repository');
  assert(/^20\d{2}-\d{2}-\d{2}$/.test(evidence.reviewDate), 'reviewDate');
  assert(SHA.test(evidence.verifiedCandidateCommit ?? ''), 'verifiedCandidateCommit');
  assert(validUrl(evidence.verifiedCandidateCi), 'verifiedCandidateCi');
  assert(evidence.verifiedCandidateCi.startsWith('https://github.com/HoriSift/HoriSift/actions/runs/'), 'candidate CI origin');
  assert(manifest && manifest.name === 'horisift' && manifest.private === true, 'private npm candidate');
  assert(manifest.version === evidence.candidateVersion, 'candidateVersion');
  assert(evidence.publication && typeof evidence.publication === 'object', 'publication');
  for (const k of ['npmPublished','githubReleaseCreated','siteDeployed','waveApplicationSubmitted']) {
    assert(evidence.publication[k] === false, 'publication '+k);
  }
  assert(Array.isArray(evidence.checks) && evidence.checks.length === REQUIRED_GATES.length, 'checks');
  const checks = new Map();
  for (const row of evidence.checks) {
    assert(row && typeof row === 'object' && !Array.isArray(row), 'check row');
    assert(ID.test(row.id ?? '') && REQUIRED_GATES.includes(row.id) && !checks.has(row.id), 'check id');
    assert(row.status === 'verified' || row.status === 'open' || row.status === 'unverified' || row.status === 'not-authorized', 'check status');
    assert(typeof row.note === 'string' && row.note.length >= 12 && row.note.length <= 500 && !/[\x00-\x1f]/.test(row.note), 'check note');
    assert(row.evidence === null || validUrl(row.evidence), 'check evidence URL');
    if (row.status === 'verified') assert(row.evidence !== null, 'verified evidence required');
    checks.set(row.id, row);
  }
  const blockers = REQUIRED_GATES.filter(id => checks.get(id).status !== 'verified')
    .map(id => ({ id, status: checks.get(id).status, evidence: checks.get(id).evidence }));
  return {
    schemaVersion: '1.0.0', repository: evidence.repository,
    reviewedCandidateCommit: evidence.verifiedCandidateCommit,
    candidateVersion: manifest.version,
    decision: blockers.length ? 'HOLD' : 'REVIEW_READY_NOT_RELEASED',
    blockers,
    released: false,
    statement: blockers.length
      ? 'Release and Wave submission are on hold. No authorization is inferred.'
      : 'Local checklist reviewed. Manual authorization and independent confirmation are still required; no release has been made.',
  };
}
export function run(args, io = { stdout: process.stdout, stderr: process.stderr }) {
  const expectHold = args.length === 1 && args[0] === '--expect-hold';
  if (args.length && !expectHold) { io.stderr.write('Usage: release-readiness [--expect-hold]\n'); return 3; }
  try {
    const input = JSON.parse(readFileSync(EVIDENCE_FILE, 'utf8'));
    const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
    const report = evaluateReadiness(input, pkg);
    io.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return expectHold ? (report.decision === 'HOLD' ? 0 : 1) : (report.decision === 'HOLD' ? 2 : 0);
  } catch (error) {
    io.stderr.write('Readiness evidence invalid or unavailable. Release remains on HOLD.\n');
    return 3;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = run(process.argv.slice(2));
