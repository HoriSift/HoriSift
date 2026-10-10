# Release and application gate

No release or deployment has been made by the foundation implementation.

Before a release: verify product-specific tests (including malformed/adversarial fixtures); `npm ci`, typecheck, lint, build and smoke checks; CLI package/bin correctness; OS/Node matrix; rule source currency; package/license/security contents; known limitations; installation from produced artifact; changelog; recorded commit SHA and successful CI run URLs. Inspect release artifacts and checksums where useful. Obtain explicit maintainer authorization before publishing a release or site.

Stellar Wave eligibility is a separate evidence/authorization decision. Re-check the dated official playbook and current official program rules; do not imply release or CI means approval. Submit only with authorization.

## Unpublished npm tarball candidate (engineering gate)

The package remains `private: true`. Candidate version `0.1.0-rc.1` is for test artifacts only; do not tag, publish to npm, create a GitHub release or deploy without separate explicit owner approval. The default `npm run cli` still launches development source; package `bin.horisift` points only to compiled `dist/cli/entry.js`. No install/pack lifecycle scripts are used; `files` allowlists compiled JS, README, license and manifest.

Use `npm ci --ignore-scripts`, then `npm run build` and `npm run release:pack` to create a checksum-labeled `.tgz` in ignored `release-artifacts/`. Use `npm run release:verify` to re-pack twice, require identical SHA-256, inspect the exact twelve-file allowlist and install that tarball into an isolated fresh npm consumer. The consumer uses npm bin shims for version and rules smoke checks and directly tests installed CLI `scan` JSON, `--fail-on` exit behavior, source secrecy and version. These are intentionally CI gates on Ubuntu, Windows and macOS with Node 22/24. Clean install downloads only pinned runtime dependency from the npm registry; never install dependencies of scanned applications. See `docs/RELEASE_CANDIDATE.md` for evidence and blockers.

**Hard release blocker:** issue https://github.com/HoriSift/HoriSift/issues/1 confirms a missed historical SDK Horizon constructor. Additional release gates remain: representative full-repository accuracy evaluation, security/schema review, packaged artifact checks from exact code/CI, owner-approved public version and support policy, and actual installation/use validation beyond smoke tests. A passing candidate gate is not release authorization or Drips acceptance.

## Evidence preflight (read-only HOLD review, 2026-10-10)

Official program documents are [Drips maintainers](https://docs.drips.network/wave/maintainers/participating-in-a-wave/), [terms/rules](https://docs.drips.network/wave/terms-and-rules/) and [per-user/per-organization limits](https://docs.drips.network/wave/maintainers/repo-application-limits/). The attached undated *Stellar Wave Builder — Master System Prompt* is a **user-provided playbook**, not formal eligibility authority. Organizer acceptance and current dashboard application status must be verified separately; no approval guarantee or assumed application slots. See `docs/RELEASE_REVIEW_2026-10-10.md`.

`npm run readiness:check` intentionally returns exit 2 while necessary evidence is open; `npm run readiness:verify-hold` is the corresponding six-platform CI gate and is not a readiness approval. The JSON data in `docs/RELEASE_READINESS.json` is a manually maintained snapshot, not an authorization token. The Phase 14 public-release acceptance remains **HOLD/NOT VERIFIED**. Open engineering issues: [historical SDK miss](https://github.com/HoriSift/HoriSift/issues/1), [complete-repo benchmark](https://github.com/HoriSift/HoriSift/issues/2).

**Artifact integrity:** restoring the public README after the original Phase 13 packaging run changes packaged tarball bytes. Do not reuse the previous SHA-256 for any tarball produced after this correction. Re-run npm pack, checksums, fresh install, and green CI for the exact package you plan to distribute. This corrective source change does not authorize a release.
