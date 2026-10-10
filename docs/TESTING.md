# Testing and verification plan

**Existing automated checks:** `npm ci`, `npm run check:foundation`, `npm run typecheck`, `npm test` in a six-job Node 22/24 x Ubuntu/Windows/macOS CI matrix. 492 standard tests (17 new candidate package/security/negative cases), 24 independent quality-gate tests and eight bounded stress tests passed on verified implementation e150397fbcda54609581265df7e75a3760b6522e; private pack and fresh consumer install passed on all six OS×Node jobs. No published npm CLI, real migration verification or measured production accuracy.

## Planned test layers

1. Unit: rules validation, AST node matching, stable IDs, severity ordering, path canonicalization, redaction and exit code precedence.
2. Integration: supported JS/TS repositories end-to-end, text and JSON parity, declared unknowns, real CLI exit codes.
3. Regression/golden: curated false-positive and historical bug fixtures with deterministic report snapshot comparison.
4. Stress/security: size and depth budgets, path escape and symlink loops, permission failures, malformed Unicode, parser recovery, no network and no code execution.
5. Cross-platform CI: Linux, Windows, macOS with Node 24, plus Node 22 compatibility; package installation with `npm ci`, typecheck, test, build and smoke commands when implemented.

## Fixture matrix (to implement as behavior becomes real)

| Scenario | Expected policy |
|---|---|
| Imported Horizon client aliased or renamed | Detect only with proven binding; accurate location |
| Multiple Horizon clients | No missing or duplicated findings |
| Comments and harmless string literals mentioning `/payments` | No executable-call finding |
| Direct static HTTP Horizon call | Detect when host/path and method are provable |
| Dynamic URL, wrapper, re-export, unknown method | Record unknown when relevant; do not guess |
| Empty repository or only unsupported files | Incomplete, never “ready” |
| Invalid JS/TS | Diagnostics, no crash; incomplete where relevant |
| Very large file, deep tree, too many files | Bounded resource failure/incomplete, not hang |
| Symlink to outside root or loop | Never follow, record diagnostic |
| Permission denied | Report incomplete, no silent success |
| Unicode filenames and Windows paths | Portable POSIX normalized report paths |
| Malformed rule metadata | Fail rule validation before analysis |
| Secrets within literals or query strings | Never print raw source snippets or secret values |
| Repeated runs on same source | Byte-identical canonical JSON |

## Evidence expectations

At each milestone record exact commands actually run and their conclusions, local Node version, Git commit SHA, per-platform GitHub Actions links, failed tests and open issues. No green claim can substitute for a run link on the same commit.

## Parser and read-path verification (2026-10-09)

Implementation: `src/parser/parse.ts` and `src/parser/read.ts`. Tests: `tests/unit/parser.test.mjs`, `tests/integration/parser-read.test.mjs`, `tests/regression/parser-regression.test.mjs`. Evidence: https://github.com/HoriSift/HoriSift/actions/runs/38000404139 at 1da388903496e2376fdbe5f07db27063353508cc — 6/6 matrix jobs passed, including pinned npm install and TypeScript 6 typecheck. Local Node 22.16.0 using available TypeScript 5.8.3 also passed 57 tests and typecheck; `npm ci --offline` with new dependencies unavailable locally, but GitHub `npm ci` passed.

Positive cases: ESM imports/aliases, CommonJS require destructuring, TS import-equals, all eight JS/TS source extensions, safe discovery-to-parse flow, UTF-8 BOM, 1-indexed locations, Unicode filenames and deterministic output. Negative/edge cases: misleading comments/strings, type-only imports, dynamic module expressions, malformed JS/TS, unsafe paths, symlink components and root, outside-root paths, invalid UTF-8/NUL, file-size boundaries, simulated errors, and explicit incomplete diagnostics without raw secret data.

Known scope: syntactic import/alias facts are not proof of binding resolution or Horizon method usage. File-system metadata checks are not an atomic snapshot. Phase 04 must test scope shadowing, reassignment, wrappers and uncertain endpoints explicitly.

## Horizon detection verification — 2026-10-09

`tests/unit/horizon-detector.test.mjs`, `tests/integration/horizon-http.test.mjs`, `tests/integration/horizon-repository.test.mjs`, and `tests/regression/horizon-detector-regression.test.mjs` add 56 detector cases (113 total tests including Phases 01–03). Tests check proven SDK imports/aliases/constructors, methods, streams, supported Horizon fetch/Axios calls, HTTP methods and URL path normalization, response provenance, deterministic ordering, exact 1-based line positions, host impersonation rejection, shadowed identifiers, import-only nonmatches, invalid syntax, dynamic URLs/methods, Windows-compatible read/discovery integration, outside-root symlinks and resource budgets. No source text, API keys, account IDs or POST bodies are serialized by detector output. Real-world precision and false negative rates have NOT been measured.

Local Node 22.16.0: `npm run typecheck` and `npm test` passed (113/113); this local environment uses TS 5.8.3. GitHub Actions: https://github.com/HoriSift/HoriSift/actions/runs/38001525787 completed SUCCESS on 5a8106f62806749363d694da06dde8a4a474d8a6 with pinned TS 6.0.3, `npm ci`, typecheck, foundation and all 113 tests on Ubuntu, Windows, macOS with Node 22 and 24 (6/6). An earlier failed CI run on original detector SHA was caused by inadvertently replacing the explicit `types:["node"]` field; fixed on the verified implementation SHA. No claims of network tests, production adoption or RPC equivalence are made.

## Versioned migration catalog verification — 2026-10-09

25 active exact detector-pattern rules plus an unknown fallback; all 25 are covered by real detector-to-classifier fixture tests. Test paths: `tests/unit/rule-catalog.test.mjs`, `tests/integration/rule-fixtures.test.mjs`, `tests/integration/migration-rule-integration.test.mjs`, `tests/regression/rule-regression.test.mjs`. Negative tests include unsupported/wrong HTTP methods, unrecognized endpoints, wrong SDK symbols, unsafe paths, duplicate pattern/ID, forged RPC method, missing source citation, secret-bearing metadata, dynamic URL, malformed source and deterministic ordering. We fixed the Phase 04 dynamic literal prefix heuristic to report uncertain Horizon URLs as incomplete rather than silently complete.

Local Node v22.16.0/TS 5.8.3: `npm run check:foundation`, `npm run typecheck`, `npm test` all passed (196/196). GitHub verified https://github.com/HoriSift/HoriSift/actions/runs/38002363095 on 06e9651fad5cd51df27d488117e8a53d527b3d21 — six successful matrix jobs (Ubuntu/Windows/macOS × Node 22/24) running `npm ci`, pinned TypeScript 6.0.3 typecheck, foundation checks and tests. No external mainnet integration tests, independent accuracy benchmark, migration approvals or live transaction testing.

## Risk and uncertainty evaluator — verification on 2026-10-10

Risk engine code: `src/analysis/risk.ts`. Added `tests/unit/risk-analysis.test.mjs` (33 tests), `tests/integration/risk-repository.test.mjs` (16), and `tests/regression/risk-regression.test.mjs` (8). Every versioned rule is exercised with separate severity/confidence expectations; boundaries include forged downgrade, contradictory mapping, duplicate sources, unsafe paths, extra secret-bearing fields, unknown-code prototype injection, dynamic HTTP, syntax failure, resource exhaustion, ignored trees and outside-root symlinks. Whole-repo examples establish true discovery→read→detect→classify→assess flow and stable sorting without executing application code.

Local Node v22.16.0/TypeScript 5.8.3: `npm run typecheck`, `npm run check:foundation` and `npm test` succeeded, 253/253. GitHub Actions https://github.com/HoriSift/HoriSift/actions/runs/38003322270 passed for 9bb554e0eeb33f6240786dda92930135332f37cb on Ubuntu/Windows/macOS × Node 22/24 (six jobs), including pinned TypeScript 6.0.3 typechecking, `npm ci`, foundation validation and all tests. No external mainnet tests, measured real-world accuracy, audited migration outcomes or grant outcomes.

## Checkout CLI acceptance — verified 2026-10-10

Files: `src/cli/main.ts`, `src/cli/entry.ts`, `bin/horisift.mjs`. 55 new tests in `tests/unit/cli.test.mjs`, `tests/integration/cli-process.test.mjs` and `tests/regression/cli-regression.test.mjs`. Tests cover help, version, rules, real process invocation, unknown/duplicate/missing flags, unusual paths, severity presentation vs all-findings thresholds, every exit code 0/1/2/3/4, unallowed/allowed incomplete status, empty and unsupported inputs, malformed syntax, throw-on-import safety, host/path secrecy, symlink refusal, deterministic JSON and real detection integration.

Local Node v22.16.0: `npm test` 308/308, `npm run typecheck`, `npm run check:foundation`, executable help/version and self-scan passed. GitHub Actions run https://github.com/HoriSift/HoriSift/actions/runs/38004114440 completed SUCCESS on d9fcb88d37168492bf065cf749d795fe47da7204 with six matrix jobs (Ubuntu/Windows/macOS × Node 22/24), npm ci, TypeScript typecheck, foundation validation, 308 automated tests and CLI smoke commands. These checks are development CLI evidence, not proof of a published npm package, stable final report schema or real-application precision/recall.

## Versioned report rendering and security validation — 2026-10-10

`src/reports/render.ts` uses canonical vetted findings, deterministic JSON key order, stable text and independent severity/confidence. New test files: `tests/unit/report-render.test.mjs`, `tests/unit/report-schema.test.mjs`, `tests/integration/report-process.test.mjs` (plus an improved legitimate incomplete-regression fixture in `tests/regression/cli-regression.test.mjs`). Six committed snapshots in `tests/golden/` cover complete, incomplete, text, JSON and 25-rule output. Two Draft 2020-12 JSON schemas in `schemas/` are tested with a limited subset validator. Positive/negative tests include real CLI output byte parity, path independence, Unicode, version and summary consistency, forged rule IDs/severity, diagnostic secrets, bidi/control path rejection, hidden source fields, empty findings, and explicit incomplete precedence. `--severity` affects text only; JSON never drops findings.

Local Node 22.16.0 / TypeScript 5.8.3: `npm run check:foundation`, `npm run typecheck` and `npm test` (372/372); dedicated schema/golden suite 31/31. GitHub https://github.com/HoriSift/HoriSift/actions/runs/38005617297 on 5b842fadd9e24bb9a03ce5ac2ca22636b5fdfe0a — 6/6 Ubuntu, Windows, macOS × Node 22/24 with pinned TS6/npm ci, all 372 tests, dedicated schema/golden checks and CLI smoke. Initial SHA ab42542ca39d436d5077ec86b8dfda9f39d4a54a failed Windows snapshots because checked-out fixtures were CRLF while renderer emitted LF; `.gitattributes` corrected fixture checkout and new CI verified. No external app accuracy, production migration or independent full JSON-schema-validator tests claimed.

## Synthetic applications and bounded stress — verified 2026-10-10

Fixtures: six synthetic application-like source repositories in `tests/fixtures/application-corpus.json` (`tests/fixtures/README.md` records provenance). `tests/integration/application-corpus.test.mjs` adds 13 tests exercising source→report positive/negative/unknown/incomplete patterns, deterministic output irrespective of file creation order, and no absolute-root leakage. `tests/regression/adversarial-property.test.mjs` adds 42 tests with path traversal, Unicode/UTF-8, malformed source, shadowed APIs, size limits, extension coverage, link escapes and errors injected during source reads. These do **not** measure independent real-world accuracy.

`tests/stress/stress.test.mjs` adds eight explicit stress tests (command: `npm run test:stress`) gated in GitHub Actions Ubuntu/Node24 only: 20,001 mocked entries at 20,000-file cap, 100,005 mocked entries at 100,000-entry cap, 256 real temporary JS/TS files (512 findings), real symlink cycle, aggregate byte cap, 320 nonexecuting generated negative variants, exact 1 MiB per-file boundary and directory depth 32. Budget for three measured count/real-source cases: less than 30 seconds each; test timeouts 35–45 seconds. Runner measurements: 150ms mocked file count, 180ms mocked entry stream, 188ms for 256 physical fixture files on Ubuntu/Node24; not 20k real physical files, peak RSS, representative real app benchmark or an expected performance SLA.

CI evidence: https://github.com/HoriSift/HoriSift/actions/runs/38006982913 success on 8d7c9d2edc095b8cd642b05b9fb183d652678e13, 6/6 matrix jobs each ran 427 standard tests, pinned npm ci/TypeScript 6 checking, schema/golden verification and CLI smoke; Ubuntu/Node24 additionally ran 8/8 stress checks. Local Node 22.16/TypeScript 5.8.3: npm test 427/427 and npm run test:stress 8/8. See `docs/TEST_HARDENING.md` for scenario provenance and explicit limitations.

## CI quality gates and deliberate failure signals — verified 2026-10-10

Phase 10 adds `scripts/check-format.mjs`, `check-lint.mjs`, `check-security.mjs`, `check-build.mjs`, `tsconfig.build.json`, and `tests/quality/quality-gates.test.mjs` (24 cases). The gates enforce a narrow LF/UTF-8/JSON whitespace policy, security-focused TypeScript AST lint, official pinned action SHAs/read-only workflow permissions, integrity-checked locked runtime dependencies, and a TypeScript-emitted JS build with compiled CLI scan/rules/help/version smoke. Negative tests deliberately corrupt formatting, inject forbidden imports/eval/fetch, weaken workflow permissions, alter lock metadata, omit a lockfile for real `npm ci`, and type-error a temporary TS project. All checks fail closed; negative-fixture failure is expected and counted as a passing signal.

GitHub Actions https://github.com/HoriSift/HoriSift/actions/runs/38007863106 on 13a4908cc8214cce462006f4934edf48d8a8453b — 6/6 Ubuntu/Windows/macOS × Node 22/24 jobs successful. Each job ran reproducible `npm ci --ignore-scripts`, online `npm audit --audit-level=high`, formatting/lint/security/TS check, emitted build and smoke, 24/24 negative tests, 427/427 standard tests, schema/golden checks and checkout CLI smoke; Ubuntu/Node24 ran 8/8 bounded stress cases. The initial CI run on 433e17ba48500f0bf1b1de9e4e6314f67e3b1cbc failed in intentional TypeScript diagnostic test: TS6 rejected the direct input invocation with TS5112. It was fixed to compile an isolated TS project, verifying intended TS2322. Local Node22.16/TS5.8.3 passed the scripted gates/24 negatives/427 tests/8 stress; no local registry audit was executed. Full details and limitations: `docs/CI_HARDENING.md`.

## Pinned real upstream files — reproducible public-source evidence, 2026-10-10

Four full, unmodified source snapshots from three independent GitHub projects at immutable commits: Axelar, Soroswap and Stellar Wind (one historical Horizon-style file and one genuine non-Horizon control). `tests/fixtures/public-upstream/manifest.json` records source URL, revision, Git blob SHA-1, SHA-256, byte length, upstream license and exact expected CLI findings/unknowns/exit codes. The inert `.source` files are copied to original upstream JS/TS paths in an isolated temporary directory before scanning. `scripts/public-example.mjs` enables offline CLI reproduction; four complete JSON golden reports capture actual CLI outputs. `tests/integration/public-upstream.test.mjs` adds 15 ordinary integration/security/regression tests for byte identity, tamper rejection, provenance, real CLI processes, deterministic golden output, incomplete overrides, control behavior and an **explicit historical false negative**. The separate `npm run test:public` re-runs those 15 checks on all six matrix jobs.

${ci} — SUCCESS on ${sha}: 6/6 Ubuntu/Windows/macOS × Node 22/24, 442 standard cases, 15 public-source cases again, 24 CI negative gates, pinned npm ci and advisory check, schema/golden checks and CLI compiled smoke; Ubuntu/Node24 additionally passed 8/8 stress tests. Local Node22.16/TS5.8.3 passed 442/442, 15/15 and 8/8 plus format/lint/security/typecheck/build/smoke. This is **four real source files, not four whole application repositories or a measured accuracy sample**. The historical version case misses a recognizable Horizon endpoint and returns complete/zero evidence; see issue #1 and docs/PUBLIC_VALIDATION.md.

## Original SVG brand and offline static landing page — verification 2026-10-10

Four static source files in site/: HTML, CSS, editable SVG mark and SVG wordmark. `npm run site:build` copies exact bytes to ignored dist-site/ without networking or deployment. `site:audit` checks HTML semantics and unique headings, skip link and navigation anchors, alt text, viewport/reduced motion/focus rules, CSS breakpoints, trusted outbound GitHub/Stellar docs URLs and GitHub documentation target paths, selected 4.5:1 WCAG AA text contrast calculations, restrictive CSP/no JavaScript/analytics/remote fonts, Unicode/line-ending integrity, symlink/active asset rejection and source-to-build byte equality. `tests/integration/site.test.mjs` adds 33 cases including injected scripts, broken links/anchors, missing assets, missing headings/focus/reduced-motion/breakpoints, unapproved trackers, SVG foreignObject, tampering, reproducibility and false marketing. `npm test` includes them; six CI jobs also run `npm run site:verify` separately.

Verified source SHA 0d8aa1c545746eb8ef3effcba649e44103a82f5c — GitHub Actions https://github.com/HoriSift/HoriSift/actions/runs/38010802527 SUCCESS 6/6 (Ubuntu, macOS, Windows × Node 22/24), 475 standard, 33 site checks twice, 24 negative gate checks, pinned installs/audit and emitted build/smoke; Ubuntu24 stress 8. Local checks reproduced with Node22.16/TS5.8.3, including 33/33 site checks. **Not checked:** full axe-core or screen-reader accessibility, real browser screenshot/actual viewport rendering (Chromium navigation in this local workspace blocked by policy), live outbound URL HTTP 404 monitoring, or deployed HTTP security headers. See docs/BRAND_SITE.md. The site is source-only; no hosting claim.

## Unpublished private candidate packaging — verified 2026-10-10

The package is now a versioned `0.1.0-rc.1` candidate with `private:true` and `bin.horisift=dist/cli/entry.js` compiled from TypeScript (no runtime source stripping inside the installed package). `tests/integration/release-package.test.mjs` adds 17 positive/negative tests covering manifest/version/lock/bin integrity, forbidden lifecycle scripts, source or site leakage, path traversal, malformed sizes, missing files/shebang and SHA256 tampering. `scripts/verify-release.mjs` creates two npm pack archives with suppressed lifecycle scripts, confirms matching SHA256/12-file allowlist, and in CI installs the candidate in a fresh temporary consumer; it runs npm-generated `horisift` bin shims, rule catalog, version, help, and an actual scan with expected threshold exit. This is not a public release or a full external security audit.

https://github.com/HoriSift/HoriSift/actions/runs/38011820467 — SUCCESS on `e150397fbcda54609581265df7e75a3760b6522e`, 6/6 matrix jobs Ubuntu/Windows/macOS × Node 22/24: each passed npm ci/audit/typecheck, compiled build/smoke, `release:verify`, 492/492 standard tests, 24 CI negative-gate tests, site:verify 33/33 and pinned examples 15/15; Ubuntu Node24 stress 8/8. Locally Node22.16/TS5.8.3 passed 492 tests and offline `release:pack` (27,494 bytes, SHA256 c49c1e2a15fd9535cffd1eb16eecb24e942a85a481e8a0ba73cc95b54c7aa8fa). Local registry unavailable; clean consumer tests are CI evidence, not local. Historical SDK false negative issue #1 and independent full-repository accuracy/security remain release blockers.

## HoriSift Wave application regression and independent docs evidence

The conservative historical `stellar-sdk` Server signal adds 11 tests for old SDK provenance (default/CommonJS/namespace/const-alias/computed-literal) and shadowed/type-only/unrelated/mutable modern controls. The pinned original Stellar Wind Git blob now produces an incomplete scan, `LEGACY_SDK_SERVER` unknown and exit 4, while `stellar-wind-control` remains complete/zero. 503 local standard tests and six platform CI jobs passed on 3955813e40e8ab828f32607829b28d91af87f758 (https://github.com/HoriSift/HoriSift/actions/runs/38014903027). Full historical API equivalence is **not** claimed. GitBook published at https://oobayemi.gitbook.io/horisift-documentation/; 15 GitHub issues link scoped implementation acceptance criteria. No whole-repository accuracy metric or Drips organizer approval is claimed.
