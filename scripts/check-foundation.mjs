import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const required = [
  'README.md', 'LICENSE', 'AGENTS.md', 'CONTRIBUTING.md', 'SECURITY.md',
  'CODE_OF_CONDUCT.md', 'CHANGELOG.md', 'package.json', 'package-lock.json',
  'tsconfig.json', '.gitignore', '.github/workflows/foundation.yml',
  'docs/PHASE_BUILDS.md', 'docs/PROJECT_HANDOFF.md', 'docs/ARCHITECTURE.md',
  'docs/PRODUCT_SPEC.md', 'docs/RULE_CATALOG.md', 'docs/TESTING.md',
  'docs/RELEASE_PROCESS.md', 'docs/LIMITATIONS.md',
  'docs/decisions/0001-local-first-static-analysis.md'
];
const labels = [
  'Objective', 'Problem', 'Deliverables', 'Files/components', 'Dependencies',
  'Implementation requirements', 'Test requirements', 'Positive scenarios',
  'Negative scenarios', 'Boundary/edge cases', 'Acceptance criteria',
  'Required CI checks', 'Known risks', 'Status', 'Verified implementation commit',
  'Evidence links', 'Remaining work'
];

export function validateFoundation(root) {
  const errors = [];
  for (const name of required) {
    if (!existsSync(resolve(root, name))) errors.push(`Missing required file: ${name}`);
  }
  if (errors.length) return errors; // avoid exceptions from missing files
  const read = (name) => readFileSync(resolve(root, name), 'utf8');
  const readme = read('README.md');
  if (/\bphase\s*0?\d+\b/i.test(readme) || /roadmap completion|milestone (?:count|percentage)/i.test(readme)) {
    errors.push('Public README exposes internal phase or milestone tracking');
  }
  if (!readme.includes('not yet implemented')) errors.push('README must honestly disclose unfinished scanner');
  const ledger = read('docs/PHASE_BUILDS.md');
  const headings = [...ledger.matchAll(/^## Phase (\d{2}) — (.+)$/gm)];
  if (headings.length !== 15 || headings.some((match, i) => Number(match[1]) !== i + 1)) {
    errors.push('Roadmap must have exactly 15 numbered, ordered phases');
  }
  for (let i = 0; i < headings.length; i++) {
    const chunk = ledger.slice(headings[i].index, headings[i + 1]?.index ?? ledger.length);
    for (const label of labels) {
      if (!chunk.includes(`**${label}:**`)) errors.push(`Phase ${i+1} missing ${label}`);
    }
    if (!/\*\*Status:\*\* (NOT STARTED|IN PROGRESS|IMPLEMENTED — UNVERIFIED|VERIFIED|BLOCKED)/.test(chunk)) {
      errors.push(`Phase ${i+1} has unsupported status`);
    }
  }
  const p = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  if (p.name !== 'horisift' || p.private !== true || !/^0\.1\.0-rc\.[1-9]\d*$/.test(p.version)) {
    errors.push('Foundation package metadata may not pretend a public package exists');
  }
  if (lock.name !== p.name || lock.version !== p.version) errors.push('Package lock out of sync');
  return errors;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const errors = validateFoundation(root);
  if (errors.length) {
    for (const message of errors) console.error(message);
    process.exitCode = 1;
  } else {
    console.log('Foundation contract validated (this is not a functional scanner test).');
  }
}
