# HoriSift public release and Stellar Wave evidence review

**Review date:** 2026-10-10 (Africa/Lagos). **Decision: HOLD — NOT READY FOR PUBLIC RELEASE OR APPLICATION.**

This is an evidence-review record and draft submission aid. It is **not** a release approval, grant decision, application submission, signed independent security review or permission to publish. The accompanying `RELEASE_READINESS.json` and `scripts/release-readiness.mjs` provide a deliberately nonzero CLI gate while blocking evidence remains. The JSON is a manually reviewed snapshot, not live approval attestation; changing it cannot authorize any external action.

## Objective and evidence checked

| Check | Evidence observed | Status | Confidence |
|---|---|---|---|
| Source repository | https://github.com/HoriSift/HoriSift — public MIT repo, `main` SHA `ab3d3d1e1dea48029d440c98b159ddbf87a03069` | VERIFIED as reviewed on 2026-10-10 | High |
| Private candidate | `0.1.0-rc.1`, `private:true`, 12 allowed files, compiled bin `dist/cli/entry.js`; SHA-256 `c49c1e2a15fd9535cffd1eb16eecb24e942a85a481e8a0ba73cc95b54c7aa8fa` on recorded local and Ubuntu24 build | VERIFIED for recorded artifact; not a public package | High |
| Candidate CI | https://github.com/HoriSift/HoriSift/actions/runs/38011820467 (code SHA `e150397fbcda54609581265df7e75a3760b6522e`); https://github.com/HoriSift/HoriSift/actions/runs/38012055977 (docs SHA `ab3d3d1e1dea48029d440c98b159ddbf87a03069`); six jobs successful each run | VERIFIED at specific SHAs | High |
| Release objects | GitHub `GET /repos/HoriSift/HoriSift/releases` returned empty; no `v0.1.0` ref available; package manifest private | No GitHub release verified; npm public registry not independently queried | High for GitHub; unknown for public npm listing |
| Historical SDK detection | https://github.com/HoriSift/HoriSift/issues/1 (OPEN); fixed source from `remarcable/stellar-wind@55b51ae1e099f619b6a2da4c341aa96cf1e79cf0` incorrectly returns `complete`, zero findings | BLOCKER — confirmed single-file false negative | High |
| Real-world coverage | https://github.com/HoriSift/HoriSift/blob/main/docs/PUBLIC_VALIDATION.md; four source files from three third-party repos, including the above miss | PARTIAL — no representative full-repo precision/recall | High for sample count; unknown population accuracy |
| Independent review | Internal format/security gate and npm audit completed; no independently evidenced security/schema audit | UNVERIFIED | High that no such evidence was supplied; no claim review impossible |
| Static website | Original site source at `site/`, static tests passed; unhosted, no actual browser/screen-reader verification | DEPLOYMENT ON HOLD | High |
| Owner authorizations | This conversation authorizes an evidence/readiness phase, **not** publishing, tagging, deployment, application or production changes | NOT AUTHORIZED | High |
| Drips maintainer application | No verified Drips dashboard submission or organizer approval for HoriSift; private dashboard inaccessible to repo-only review | NOT VERIFIED — don't claim accepted or rejected | High |

## Policy sources, authority and date

**User-supplied playbook:** the uploaded eight-page *Stellar Wave Builder — Master System Prompt*, undated in the document and without authoritative program issuer/version. This is a helpful **user-provided workflow guide**, not an official Drips eligibility ruling. It asks for evidence-driven ecosystem comparison, real demonstration, repository hygiene, accurate planned issues and checked approved-repo status. Its generic smart-contract, app deployment and on-chain verification requirements **do not literally apply** to this local-first CLI; adapt them into a real terminal demo, real package, code documentation, tests and maintainer practice rather than inventing contract addresses.

**Official Drips documents consulted 2026-10-10:**

- [Stellar Wave program](https://www.drips.network/wave/stellar) lists Wave 10 for October 15–22, 2026 (displayed hours may use the site's timezone). This is a cycle schedule, **not** an application-approval deadline or a guarantee of participation.
- [Maintainer participation](https://docs.drips.network/wave/maintainers/participating-in-a-wave/) requires onboarding the GitHub organization, installing the Drips Wave App, explicitly applying a public repository to the relevant Program and awaiting organizer approval. The dashboard is the application-status authority.
- [Wave Terms and Rules](https://docs.drips.network/wave/terms-and-rules/) section 3.1 reserves admission to organizers' discretion. Section 6 prohibits low-effort, deceptive or untested LLM-origin contributions and manipulation; accurate, maintained work matters more than repo counts. These Terms may change; recheck at application time.
- [Repository application limits](https://docs.drips.network/wave/maintainers/repo-application-limits/) says per-user and per-org limits **may** be set and reset per Wave; current organization-specific remaining slots are not visible to a public audit. Do not claim an unrestricted number of applications.
- [Approved repository listing](https://www.drips.network/wave/stellar/repos) currently shows 824 approved repositories in the program (review-time page output). This list is a dynamic app; its first rendered page cannot establish whether HoriSift specifically appears, and no organizer approval was obtained in this review.

**Stellar technical source consulted 2026-10-10:** [Official Horizon to RPC migration guide](https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc) distinguishes Horizon REST/HAL and RPC JSON-RPC, documents endpoints without direct replacements, conditional classic events, indexer needs and history limitations. Do not claim 1:1 API parity or automatic migration correctness.

## Current decisions and acceptance boundary

1. **Engineering preflight:** a verified private candidate is installable from the generated tarball on Ubuntu/Windows/macOS Node 22/24. It remains `private:true`. This is a positive release-*engineering* fact, not a public release.
2. **Public package:** **HOLD** until issue #1 is fixed, provenance/precision coverage is stronger, security/schema review is evidenced, support/ownership is defined and user explicitly authorizes publishing. Change version/checksum and rerun the complete gate after any code change.
3. **Public static website:** **HOLD** separately until actual browser/screen-reader and host-header reviews plus owner approval. Source-only site tests do not prove deployment accessibility.
4. **Stellar Wave repository application:** **HOLD** until the repo is genuinely maintainable, has scoped contributor issues, its Drips dashboard onboarding/application slots are checked, and its owner explicitly approves submission. Program approval is never guaranteed.
5. **Internal milestone:** evidence audit, policy reconnaissance and fail-closed HOLD preflight may be verified on a CI-passing commit, but **Phase 14 publication/application acceptance cannot be marked VERIFIED** without actual authorized artifacts and organizer application evidence.

## Application-material draft — NOT submitted

**Project description:** HoriSift is a local-first JavaScript/TypeScript command-line tool that examines source code to identify recognized Stellar Horizon dependencies and explain migration investigation priorities. It produces deterministic text and JSON findings, flags uncertain information such as dynamic Horizon URLs and does not execute the scanned application. It helps maintainers plan a migration from Horizon's REST-like interface toward Stellar RPC and/or indexing services, without claiming automatic conversion or coverage of every SDK version.

**Why Stellar-specific:** Horizon and Stellar RPC expose different APIs and history/indexing semantics; application maintainers need to inventory SDK constructors, API calls and response-shape assumptions before migrating. Official Stellar migration documentation is linked above.

**Current contributor backlog:** [GitHub issue #1](https://github.com/HoriSift/HoriSift/issues/1) proposes scope-aware recognition or explicit uncertainty for legacy Stellar SDK constructors, with positive, shadowed, malformed and real-upstream regression tests. A complete-repository evaluation is now tracked in [GitHub issue #2](https://github.com/HoriSift/HoriSift/issues/2), with explicit ground-truth accuracy and reproducibility acceptance criteria. Independent security/schema review and further packaged usability work remain recommendations, not issues falsely claimed to exist. Do not manufacture volume or issue complexity labels.

**Proof links:** Repo https://github.com/HoriSift/HoriSift; pinned real-source validation `docs/PUBLIC_VALIDATION.md`; private candidate `docs/RELEASE_CANDIDATE.md`; latest completed six-platform run above. **Not available:** public npm package URL, hosted site, public end-to-end demo video, Drips approval, on-chain contract links (not applicable to this CLI).

## Prioritized next actions

| Priority | Action | Proposed owner | Acceptance evidence |
|---|---|---|---|
| P0 | Fix or conservatively flag historical `StellarSdk.Server` constructor and prevent `complete/zero` false certainty; update pinned corpus golden deliberately | HoriSift maintainer/developer | Issue #1 linked PR, exact code SHA, positive/negative/shadowing/adversarial cases and green six-job CI |
| P0 | Evaluate complete public Stellar application repos at immutable commits, with adjudicated gold labels and misses/false positives | HoriSift maintainer + independent reviewer (issue #2) | Provenance ledger, reproducible full-repo commands and measured—not invented—precision/recall with limitations |
| P1 | Independent security/schema/public packaging review and release support/disclosure | Designated reviewers/maintainer | Review notes, resolved risks, install/repack evidence and confirmed policy/maintainer contact |
| P1 | Record authentic command demo and documentation; verify the static website in real browsers if hosting is desired | Maintainer/tester | Recorded authentic CLI session, keyboard/mobile/screen-reader findings and hosted security response headers if approved |
| P0 before any application | Check current Drips program rules, onboarding, available application slots and any organizer decision | Maintainer with Drips dashboard access | Current screenshots/status receipts or official application confirmation; no guesses |
| P0 before publication | Obtain scoped explicit owner authorization to publish/tag/deploy/submit separately | Repository owner | Clear written release/version/artifact and program instructions; independent step after engineering gates |

## Reproduce the HOLD gate

From a HoriSift checkout with Node 22.12+/24:

```bash
npm ci --ignore-scripts
npm run readiness:check        # returns exit 2 while release is on HOLD
npm run readiness:verify-hold  # returns 0 only when the documented HOLD remains enforced
npm run verify:gates           # tests malicious/invalid readiness evidence too
```

The gate is local and read-only. It never calls npm publish, git tag, a host or Drips APIs. It rejects invalid evidence and requires URLs for evidence marked verified, but URLs and human assertions are **not cryptographic or independent approval proof**. The owner must review actual linked materials before changing any gate state.
