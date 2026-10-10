# Reproducible CI and security-focused quality gates

**Engineering scope:** Checkout-based HoriSift development only. This document is not a published-package, formal-security-audit, or migration-readiness certification. Reviewed 2026-10-10; verified GitHub implementation SHA and CI evidence are recorded in `docs/PROJECT_HANDOFF.md` and `docs/PHASE_BUILDS.md`.

## Workflow isolation and reproducibility

`.github/workflows/foundation.yml` runs on push to `main` and pull requests, as six separate jobs: Ubuntu/Windows/macOS x Node 22/24. Workflow token is read-only (`permissions: contents: read`). `actions/checkout` and `actions/setup-node` use full 40-character commit SHAs from their official repositories, rather than mutable major-version tags. Checkout disables persisted credentials. No `pull_request_target`, release, deployment or secret write is part of this workflow.

The build runs `npm ci --ignore-scripts` from the committed v3 lockfile; package metadata and integrity/location checks run without network access. An **online** `npm audit --audit-level=high` checks current known high/critical advisories, failing the workflow if npm reports them or the audit itself fails. The audit is not a guarantee of zero vulnerabilities and depends on npm registry/advisory availability; it does not auto-remediate dependencies.

## Quality-gate sequence

1. `npm run check:foundation` verifies repository and public documentation safeguards.
2. `npm run format:check` enforces UTF-8, LF line endings, no trailing whitespace/tabs, final newlines and valid JSON in checked source/test/config files. Golden fixtures are kept in LF via `.gitattributes`. This is **not** a full Prettier-style code formatter.
3. `npm run lint` performs TypeScript-AST security-policy lint of `src/`: banned dynamic imports, `eval`, `Function` constructors, direct `require`/`fetch`, forbidden process and network modules, unreviewed external imports and suppression directives. This is a **purpose-built narrow lint**, not a comprehensive ESLint ruleset.
4. `npm run security:check` validates official pinned action identities, minimal permissions, `npm ci --ignore-scripts`, audit and failure-test requirements, exact runtime dependencies and lockfile integrity metadata. This is not a vulnerability audit.
5. `npm run typecheck` and `npm run build` run strict TypeScript checking and separately emit runnable JavaScript with import-extension rewriting using `tsconfig.build.json`.
6. `npm run smoke:build` launches the emitted `dist/cli/entry.js` and validates help, version, rule catalog and a real source scan with CI threshold semantics. `dist/` remains ignored and unshipped; this is not yet a bundled or published release artifact.
7. `npm run verify:gates` verifies **24 tests**, including deliberately invalid formatting, unsafe imported code, excessive permissions, mutable action tags, dependency lock drift, a real lockfile-less `npm ci` failure, and an intentionally invalid TypeScript project expected to produce compiler error `TS2322`. These negative fixtures are isolated from production source and do not disable checks.
8. `npm test` runs 427 standard tests in each job; schema and golden report comparisons and CLI checkout smokes follow. `npm run test:stress` runs eight bounded stress checks on Ubuntu/Node 24 only.

## Failure-policy and evidence discipline

The workflow is fail-closed: no `continue-on-error`, skipped lint/security checks, automatic `npm audit fix`, or ignored test failures. A failed gate prevents a green result for that job; the test matrix leaves all OS/Node failures visible (`fail-fast: false`). CI evidence must cite the exact source commit and workflow run, not an unrelated previous green commit. Deliberately broken type-check fixtures prove non-zero error signaling, not compiler correctness beyond those fixtures.

The initial implementation run exposed a TypeScript 6 behavior difference: compiling a standalone file with a project config nearby produced `TS5112` before the intended invalid-type diagnostic. The negative test was corrected to invoke a self-contained temporary `tsconfig.json`, with `TS2322` asserted. Do not count the earlier failing run as green.

## Known limitations

- Formatting/linting are deliberately narrow policy checks; they do not replace a full third-party static analyzer, dependency review or source audit.
- Online npm vulnerability advisory feeds can be unavailable or incomplete; passing `npm audit` checks the feed at one point in time, not the entire supply chain.
- Generated JavaScript runs from the local checkout and relies on its existing TypeScript dependency; no standalone npm tarball/install acceptance has yet been verified.
- Stress uses synthetic counts and a 256-file real local fixture; this is not a representative real Stellar repository performance or precision/recall benchmark.
- No application execution, signing, live Horizon/RPC calls, npm publish, deployment, or grant application occurs.

## Primary engineering reference material

- GitHub [secure use of Actions](https://docs.github.com/en/actions/reference/security/secure-use): pin actions to full commit SHAs, minimize privileges.
- GitHub [security threat guidance](https://docs.github.com/en/code-security/tutorials/secure-your-organization/protect-against-threats): secure workflow execution.
- npm [`ci` documentation](https://docs.npmjs.com/cli/commands/npm-ci/): reproducible lock-based clean installation and install script handling.
- npm [`audit` documentation](https://docs.npmjs.com/cli/npm-audit/): advisory scope and audit-level semantics.