# HoriSift development roadmap and milestone evidence ledger

Canonical plan authored 2026-10-09. All entries are planned; this file is NOT proof of implementation. Status vocabulary: `NOT STARTED`, `IN PROGRESS`, `IMPLEMENTED — UNVERIFIED`, `VERIFIED`, `BLOCKED`. Verified results require actual commit/test/CI links. Internal progress belongs here and not in the public README.

## Phase 01 — Foundation & Architecture

- **Objective:** Choose verified API and system boundaries.
- **Problem:** Unproven API assumptions and premature detector design.
- **Deliverables:** architecture, product spec, official sources, rule/report/CLI contracts, contributor safeguards.
- **Files/components:** README; AGENTS; docs; workflows; package metadata.
- **Dependencies:** Official docs, repo access.
- **Implementation requirements:** Scope JS/TS and initial direct HTTP/SDK patterns; define safe resolver, severity, unknowns, report invariants.
- **Test requirements:** Foundation checks and negative tests for missing metadata, unsafe public README, malformed phase ledger.
- **Positive scenarios:** Complete docs with correct references.
- **Negative scenarios:** Missing mandatory document fails checks.
- **Boundary/edge cases:** Windows path spelling, repeated checks.
- **Acceptance criteria:** Docs and safeguards merged; foundation checks pass on Node 22/24 CI; SHA and run links recorded.
- **Required CI checks:** Foundation CI on Ubuntu, Windows, macOS and Node 22/24.
- **Known risks:** Stale SDK examples, uncontrolled scope.
- **Status:** VERIFIED.
- **Verified implementation commit:** fd66579eef212d7973dfd3d8901633f72e89e20f (foundation tests and documents).
- **Evidence links:** https://github.com/HoriSift/HoriSift/actions/runs/37997210979 — successful push run for fd66579eef212d7973dfd3d8901633f72e89e20f: foundation document check, `npm ci`, and five foundation unit tests across Ubuntu, Windows, macOS on Node 22 and 24 (six jobs, each concluded success); reviewed 2026-10-09.
- **Remaining work:** None for Phase 01 acceptance; implement bounded discovery and adversarial fixtures in Phase 02. Scanner functionality and detection rules remain unimplemented.

## Phase 02 — Repository Discovery

- **Objective:** Safely enumerate candidate files.
- **Problem:** Unbounded or unsafe filesystem walking.
- **Deliverables:** bounded recursive discovery with exclusions and portable paths.
- **Files/components:** src/scanner; tests/fixtures.
- **Dependencies:** Phase 01 architecture.
- **Implementation requirements:** Skip symlinks by default; canonical root; explicit size/depth/file limits.
- **Test requirements:** Unit and integration filesystem fixtures.
- **Positive scenarios:** JS and TS directory traversal.
- **Negative scenarios:** Denied path, unsupported input, non-repo.
- **Boundary/edge cases:** Symlink cycles, traversal outside root, Unicode, long paths.
- **Acceptance criteria:** Never follow external paths; bounded results, incomplete diagnostics.
- **Required CI checks:** Discovery tests Linux/Windows/macOS.
- **Known risks:** Filesystem races, Windows permissions.
- **Status:** VERIFIED.
- **Verified implementation commit:** ccfdcd790697f9861a65237cc8c6aec0275feeee.
- **Evidence links:** https://github.com/HoriSift/HoriSift/actions/runs/37998035271 — completed SUCCESS on ccfdcd790697f9861a65237cc8c6aec0275feeee; six checks passed (Ubuntu, Windows, macOS × Node 22, 24); checked 2026-10-09. Local Node 22.16.0: npm ci --offline, npm run check:foundation, npm test (25/25 passed); locally installed TypeScript tsc --noEmit also passed, not a pinned CI check.
- **Remaining work:** No blockers to Phase 02 scope. Known limitation: filesystem operations are not an atomic snapshot; parser must revalidate before reading source. Published CLI and runtime migration detection remain future phases.

## Phase 03 — Source Parsing Engine

- **Objective:** Parse untrusted JS/TS into position-aware ASTs.
- **Problem:** Text matching misses bindings and produces false positives.
- **Deliverables:** AST parse and diagnostic collection.
- **Files/components:** src/parser; tests/fixtures.
- **Dependencies:** Safe discovery.
- **Implementation requirements:** Support defined extensions, modules, aliases without execution.
- **Test requirements:** Parser unit and malformed corpus.
- **Positive scenarios:** Correct import and location.
- **Negative scenarios:** Comment, string, invalid syntax.
- **Boundary/edge cases:** TSX, malformed multibyte text, huge file.
- **Acceptance criteria:** No code execution; parser diagnostics; stable positions.
- **Required CI checks:** Parser tests on supported Node/OS.
- **Known risks:** Parser throughput, syntax version skew.
- **Status:** VERIFIED.
- **Verified implementation commit:** 1da388903496e2376fdbe5f07db27063353508cc (source parser, safe reader, pinned dependencies, CI fix).
- **Evidence links:** https://github.com/HoriSift/HoriSift/actions/runs/38000404139 — SUCCESS on 1da388903496e2376fdbe5f07db27063353508cc, six jobs (Ubuntu/Windows/macOS x Node 22/24), including npm ci, typecheck, foundation check and npm test (57/57 tests; 32 parser/reader additions); verified 2026-10-09. Initial CI for e34582b791f0033a5841bcf5fe51c17a66fed891 failed TypeScript 6 typecheck; fixed by explicit Node types in 1da388903496e2376fdbe5f07db27063353508cc. Local Node 22.16.0: npm run check:foundation, npm run typecheck, npm test (57/57, using globally available TS 5.8.3).
- **Remaining work:** No outstanding blockers within Phase 03 scope. Phase 04 must add proven SDK/HTTP detection and scope-aware symbol resolution; syntax-only import and const-alias facts do not prove APIs are used. Concurrency filesystem race caveat remains documented.

## Phase 04 — Horizon Usage Detection

- **Objective:** Find provable Horizon SDK and HTTP dependencies.
- **Problem:** Horizon dependencies remain invisible or conflated with ordinary HTTP.
- **Deliverables:** SDK, HTTP, and response-shape detectors.
- **Files/components:** src/analysis; tests/unit; tests/integration.
- **Dependencies:** Parsing AST.
- **Implementation requirements:** Proven symbol binding; static host/path; explicit dynamic unknowns.
- **Test requirements:** Positives, negative non-matches, renamed imports, line tests.
- **Positive scenarios:** Recognized Horizon calls.
- **Negative scenarios:** Non-Horizon fetch and comments.
- **Boundary/edge cases:** Aliases, clients, wrappers, dynamic URLs.
- **Acceptance criteria:** No unsupported claims and source locations recorded.
- **Required CI checks:** Detector tests and false-positive regressions.
- **Known risks:** Missed indirect usage and SDK variants.
- **Status:** VERIFIED.
- **Verified implementation commit:** 5a8106f62806749363d694da06dde8a4a474d8a6 (detector and TypeScript configuration fix).
- **Evidence links:** https://github.com/HoriSift/HoriSift/actions/runs/38001525787 — GitHub Actions SUCCESS on 5a8106f62806749363d694da06dde8a4a474d8a6, Ubuntu/Windows/macOS × Node 22/24: 6/6 successful jobs, npm ci, TypeScript 6 typecheck, foundation validation and 113 tests (56 detector/integration/regression additions). Local Node 22.16.0: npm run typecheck and npm test, 113/113 passed. Original detector SHA 678788cc3d8cd1701f7c677992c9751acbe0e3ed failed TypeScript CI because Node typings were omitted from tsconfig; corrected on verified SHA. Checked 2026-10-09.
- **Remaining work:** Phase 04 acceptance met for declared conservative patterns. Limitations: only known official Horizon hosts for static direct HTTP, limited SDK constructor/call chains, bounded aliases, response-shape evidence with proven provenance, and no custom Horizon provider / arbitrary wrapper resolution. Rules, mapping advice, severity and CLI are NOT implemented; Phase 05 must implement source-backed rule definitions.

## Phase 05 — Migration Rule Catalog

- **Objective:** Provide versioned, source-backed rules.
- **Problem:** Invented or stale endpoint equivalences harm users.
- **Deliverables:** validated rule catalog, source register, rule tests.
- **Files/components:** src/rules; docs/RULE_CATALOG.
- **Dependencies:** Verified official migration sources.
- **Implementation requirements:** Distinguish direct, conditional, indexer-needed, no direct equivalent, unknown.
- **Test requirements:** Per-rule fixtures and invalid-schema tests.
- **Positive scenarios:** Correct supported mapping advice.
- **Negative scenarios:** Wrong SDK method or mapping rejected.
- **Boundary/edge cases:** Protocol 23 classic-event settings, history expiry.
- **Acceptance criteria:** Every active rule linked to official source and tests.
- **Required CI checks:** Rule validation and all individual rule tests.
- **Known risks:** Rapid protocol/API changes.
- **Status:** VERIFIED.
- **Verified implementation commit:** 06e9651fad5cd51df27d488117e8a53d527b3d21 (catalog, exact classification, regression fix for dynamic URL heuristic, 83 added tests).
- **Evidence links:** https://github.com/HoriSift/HoriSift/actions/runs/38002363095 — SUCCESS on 06e9651fad5cd51df27d488117e8a53d527b3d21, six CI jobs across Ubuntu/Windows/macOS × Node 22 and 24; npm ci, foundation check, TypeScript 6 typecheck, and 196 tests passed (83 new tests, 25 real detector rule fixtures); reviewed 2026-10-09. Local Node v22.16.0/TS 5.8.3: npm run check:foundation, npm run typecheck, npm test 196/196. Official Stellar migration guide verified 2026-10-09 (page last updated 2026-08-18): https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc.
- **Remaining work:** Phase 05 acceptance met for 25 exact, source-backed classifications and conservative unmapped fallback. Limits: no runtime risk assessment (Phase 06), CLI, release, empirical precision/recall, custom Horizon provider recognition, or automatic migration; SDK builder endpoints can be ambiguous and remain unknown when insufficient. Revalidate official API changes before release.

## Phase 06 — Risk Analysis Engine

- **Objective:** Assign honest risk and confidence.
- **Problem:** Findings lack actionable triage or overclaim safety.
- **Deliverables:** risk evaluator and uncertainty propagation.
- **Files/components:** src/analysis; src/rules.
- **Dependencies:** Detectors and rule catalog.
- **Implementation requirements:** Severity distinct from confidence; unknown never becomes ready.
- **Test requirements:** Unit, integration, regression.
- **Positive scenarios:** Clear high-priority indexed history risk.
- **Negative scenarios:** Ambiguous mapping remains unknown.
- **Boundary/edge cases:** Duplicate locations, multiple matches.
- **Acceptance criteria:** Deterministic risk result with qualified advice.
- **Required CI checks:** Risk engine test suite.
- **Known risks:** Subjective severity and false certainty.
- **Status:** VERIFIED.
- **Verified implementation commit:** 9bb554e0eeb33f6240786dda92930135332f37cb (risk evaluator and 57 new unit/integration/regression tests).
- **Evidence links:** https://github.com/HoriSift/HoriSift/actions/runs/38003322270 — SUCCESS for 9bb554e0eeb33f6240786dda92930135332f37cb, 6/6 jobs on Ubuntu/Windows/macOS × Node 22/24, npm ci, pinned TypeScript typecheck, foundation checks, and 253 automated tests. Local Node v22.16.0/TS5.8.3: npm run typecheck, npm run check:foundation, npm test (253/253). Official migration/API guidance checked 2026-10-10.
- **Remaining work:** Phase 06 accepted within static-risk scope. Future work: Phase 07 CLI command/exit precedence, Phase 08 final report renderer, real-repo recall/precision, provider capability validation. Static severity and confidence are not measured production risk or approval; zero findings is not migration-ready.

## Phase 07 — CLI & Developer Experience

- **Objective:** Implement predictable command contract.
- **Problem:** Tools difficult to use manually or in CI.
- **Deliverables:** scan/rules/help CLI, validation and exit codes.
- **Files/components:** src/cli; package.json; docs/PRODUCT_SPEC.
- **Dependencies:** Scanner pipeline.
- **Implementation requirements:** Implement docs CLI contract and exact precedence.
- **Test requirements:** CLI acceptance and invalid-input tests.
- **Positive scenarios:** Valid scan command.
- **Negative scenarios:** Unknown flags, invalid config.
- **Boundary/edge cases:** Empty repo, non-readable root.
- **Acceptance criteria:** Stable exit codes and useful errors.
- **Required CI checks:** CLI smoke and argument tests.
- **Known risks:** Windows shell differences.
- **Status:** VERIFIED.
- **Verified implementation commit:** d9fcb88d37168492bf065cf749d795fe47da7204.
- **Evidence links:** https://github.com/HoriSift/HoriSift/actions/runs/38004114440 — SUCCESS on d9fcb88d37168492bf065cf749d795fe47da7204; six Ubuntu/Windows/macOS x Node 22/24 jobs with npm ci, typecheck, foundation validation, 308 tests (55 new CLI cases) and CLI help/version/rules smoke steps; verified 2026-10-10. Local Node 22.16.0: npm test 308/308, npm run typecheck and foundation validation passed.
- **Remaining work:** No Phase 07 scope blocker. This is a checkout-based development CLI, not a published npm package or bundled executable. Phase 08 still owns stable text/JSON report renderer and golden tests. Real-world validation and release approvals remain outstanding.

## Phase 08 — Reporting Engine

- **Objective:** Produce secure, deterministic reports.
- **Problem:** Non-reproducible or leak-prone output.
- **Deliverables:** text and JSON renderers, stable schema.
- **Files/components:** src/reports; docs/ARCHITECTURE.
- **Dependencies:** Findings, CLI.
- **Implementation requirements:** Sort paths/IDs, redact content, stable key ordering.
- **Test requirements:** Snapshot and schema tests.
- **Positive scenarios:** Identical repeated input bytes.
- **Negative scenarios:** No raw tokens or absolute paths.
- **Boundary/edge cases:** Unicode paths, duplicate ordering.
- **Acceptance criteria:** Stable schema and secure complete/incomplete status.
- **Required CI checks:** JSON/text golden tests.
- **Known risks:** Sensitive source in error paths.
- **Status:** VERIFIED.
- **Verified implementation commit:** 5b842fadd9e24bb9a03ce5ac2ca22636b5fdfe0a (report renderers, v1 JSON schemas, six golden snapshots, 64 new tests and Windows LF fix).
- **Evidence links:** https://github.com/HoriSift/HoriSift/actions/runs/38005617297 — completed SUCCESS on 5b842fadd9e24bb9a03ce5ac2ca22636b5fdfe0a, 6/6 jobs on Ubuntu/Windows/macOS × Node 22/24, 372 automated tests (64 new), pinned TypeScript typecheck, foundation checks, dedicated v1 JSON Schema and golden-byte CI step, and CLI smoke; checked 2026-10-10. Prior implementation SHA ab42542ca39d436d5077ec86b8dfda9f39d4a54a had failed Windows snapshot tests due CRLF checkout of golden text, fixed by .gitattributes on verified SHA. Local Node 22.16.0: npm test 372/372, typecheck and golden tests passed.
- **Remaining work:** Phase 08 accepted for checkout CLI v1 report contract. Remaining: independent full JSON Schema implementation validation, public package/release authorization, high-volume and real-world benchmark hardening in Phase 09, and security audit. A complete clean scan is not migration readiness.

## Phase 09 — Test Hardening

- **Objective:** Cover realistic failures and adversarial inputs.
- **Problem:** Happy-path-only tests hide breakage.
- **Deliverables:** expanded fixture corpus and performance budget.
- **Files/components:** tests/unit; tests/integration; tests/regression; tests/fixtures.
- **Dependencies:** Functional scanner.
- **Implementation requirements:** Run large repository and mutation corpus within limits.
- **Test requirements:** Cross-platform, stress, property checks.
- **Positive scenarios:** Supported app patterns.
- **Negative scenarios:** Malformed, unrecognized patterns.
- **Boundary/edge cases:** Symlink loops, 20k files, unicode, total byte limit.
- **Acceptance criteria:** Bounded time/resources and no suppressed failures.
- **Required CI checks:** Full test suite + resource checks.
- **Known risks:** OS-specific flaky fixtures.
- **Status:** VERIFIED.
- **Verified implementation commit:** 8d7c9d2edc095b8cd642b05b9fb183d652678e13 (six synthetic application scenarios, 55 standard regression/integration tests, eight dedicated stress checks, CI stress gate).
- **Evidence links:** https://github.com/HoriSift/HoriSift/actions/runs/38006982913 — completed SUCCESS for 8d7c9d2edc095b8cd642b05b9fb183d652678e13: six matrix jobs Ubuntu/Windows/macOS × Node 22/24 each run pinned npm ci, typecheck, foundation, all 427 standard tests, report golden/schema and CLI smoke. Ubuntu/Node24 additionally runs 8 stress tests. Measured on that runner: 20,001 mocked file entries 150ms; 100,000 mocked directory entries 180ms; 256 real temporary files / 512 recognized findings 188ms. Checked 2026-10-10. Source standards: https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc reviewed 2026-10-10. Local Node 22.16: npm test 427/427, npm run typecheck, npm run check:foundation; dedicated npm run test:stress 8/8.
- **Remaining work:** Phase 09 acceptance met for the declared synthetic corpus, security regression coverage and bounded tests. **Not established:** independent real-world Stellar application precision/recall, scanning 20k physical files, peak RSS/memory ceiling, active filesystem race immunity or a published package. Phase 10 must add formatting/lint/build/dependency/security CI and verified intentional-failure signaling. See docs/TEST_HARDENING.md.

## Phase 10 — GitHub Actions & CI

- **Objective:** Make reproducible verification visible.
- **Problem:** Local-only claims lack evidence.
- **Deliverables:** CI workflow matrix and dependency checks.
- **Files/components:**  .github/workflows; package lock.
- **Dependencies:** Working code and tests.
- **Implementation requirements:** npm ci, formatting, lint, types, unit+integration+regression, build and smoke.
- **Test requirements:** Deliberately fail checks to verify failure signal.
- **Positive scenarios:** Green on qualifying commit.
- **Negative scenarios:** Broken dependencies halt CI.
- **Boundary/edge cases:** Windows/mac paths, Node versions.
- **Acceptance criteria:** CI run links reflect exact SHA on declared matrix.
- **Required CI checks:** Ubuntu/Windows/macOS Node 22/24 plus security checks.
- **Known risks:** Slow builds, workflow permission creep.
- **Status:** NOT STARTED.
- **Verified implementation commit:** Not yet verified.
- **Evidence links:** None verified yet.
- **Remaining work:** Implement deliverables; run all listed tests; record SHA, real logs/CI URLs, unresolved risks, and acceptance decision.

## Phase 11 — Documentation & Real-world Validation

- **Objective:** Prove useful workflows on public sample code.
- **Problem:** Readers cannot reproduce claims.
- **Deliverables:** CLI reference, real examples, public corpus notes.
- **Files/components:** README; docs; tests/fixtures.
- **Dependencies:** Functional CLI + reports.
- **Implementation requirements:** Use authentic outputs and preserve provenance.
- **Test requirements:** Re-run example scanning on fixed SHA.
- **Positive scenarios:** Detected supported Horizon use.
- **Negative scenarios:** Non-Horizon control sample.
- **Boundary/edge cases:** Historical SDK version coverage.
- **Acceptance criteria:** Document evidenced utility with known limits.
- **Required CI checks:** Docs examples CI, fixture checks.
- **Known risks:** Samples change upstream.
- **Status:** NOT STARTED.
- **Verified implementation commit:** Not yet verified.
- **Evidence links:** None verified yet.
- **Remaining work:** Implement deliverables; run all listed tests; record SHA, real logs/CI URLs, unresolved risks, and acceptance decision.

## Phase 12 — Brand Identity & Landing Page

- **Objective:** Publish original accessible product introduction.
- **Problem:** Discoverability without fabricated capability.
- **Deliverables:** logo, static site, accessibility checks.
- **Files/components:** site; README assets.
- **Dependencies:** Working CLI and approved direction.
- **Implementation requirements:** No fake usage/output or endorsement; minimal site.
- **Test requirements:** Accessibility, responsive and link checks.
- **Positive scenarios:** Clear installation route.
- **Negative scenarios:** No broken URLs / fake metrics.
- **Boundary/edge cases:** Small screens, keyboard nav, contrast.
- **Acceptance criteria:** Real brand assets and verified demo, no deployment without approval.
- **Required CI checks:** Site build and accessibility CI.
- **Known risks:** Design asset provenance and stale screenshots.
- **Status:** NOT STARTED.
- **Verified implementation commit:** Not yet verified.
- **Evidence links:** None verified yet.
- **Remaining work:** Implement deliverables; run all listed tests; record SHA, real logs/CI URLs, unresolved risks, and acceptance decision.

## Phase 13 — Release Hardening

- **Objective:** Create reproducible release candidate.
- **Problem:** Working checkout may not install as package.
- **Deliverables:** package, candidate artifacts, security review.
- **Files/components:** package.json; CHANGELOG; scripts; docs/RELEASE_PROCESS.
- **Dependencies:** Validated scanner, documentation, CI.
- **Implementation requirements:** Final artifact smoke tests, versioning and checksums.
- **Test requirements:** Clean machine install, cross OS, package manifest checks.
- **Positive scenarios:** Working packaged CLI.
- **Negative scenarios:** Missing artifact or broken bin.
- **Boundary/edge cases:** Windows extraction, source maps, secrets.
- **Acceptance criteria:** Release candidate meets documented gate.
- **Required CI checks:** Final commit CI and artifact checks.
- **Known risks:** Package registry mismatch.
- **Status:** NOT STARTED.
- **Verified implementation commit:** Not yet verified.
- **Evidence links:** None verified yet.
- **Remaining work:** Implement deliverables; run all listed tests; record SHA, real logs/CI URLs, unresolved risks, and acceptance decision.

## Phase 14 — Public Release & Wave Readiness

- **Objective:** Release only with authorization and truthful evidence.
- **Problem:** Unverified publishing harms trust.
- **Deliverables:** reviewed candidate, release notes, evidence pack.
- **Files/components:** docs/PROJECT_HANDOFF; docs/RELEASE_PROCESS.
- **Dependencies:** Release gate satisfied and owner permission.
- **Implementation requirements:** Verify official Wave rules and final relevant SHA.
- **Test requirements:** Published archive/installation tests if authorized.
- **Positive scenarios:** Published verified release.
- **Negative scenarios:** HOLD on unknown official criteria.
- **Boundary/edge cases:** Artifacts differ from final source.
- **Acceptance criteria:** Actual published artifacts and application evidence verified.
- **Required CI checks:** Published release and CI validation.
- **Known risks:** Program eligibility may change; no guaranteed approval.
- **Status:** NOT STARTED.
- **Verified implementation commit:** Not yet verified.
- **Evidence links:** None verified yet.
- **Remaining work:** Implement deliverables; run all listed tests; record SHA, real logs/CI URLs, unresolved risks, and acceptance decision.

## Phase 15 — Maintenance & Adoption

- **Objective:** Preserve usefulness over time.
- **Problem:** Rules go stale as APIs and SDKs evolve.
- **Deliverables:** triage, rule updates, performance regressions, feedback log.
- **Files/components:** issues; docs; rules; tests.
- **Dependencies:** Release and real users.
- **Implementation requirements:** Source review cadence, responsible fixes and version bumps.
- **Test requirements:** Regression suite for bugs and newer SDK/API cases.
- **Positive scenarios:** Fix reproducible issue.
- **Negative scenarios:** Reject unsupported request transparently.
- **Boundary/edge cases:** New protocol variants and deprecations.
- **Acceptance criteria:** Truthful tracked changes and maintained docs.
- **Required CI checks:** Post-release checks per commit.
- **Known risks:** Maintainer capacity and evolving providers.
- **Status:** NOT STARTED.
- **Verified implementation commit:** Not yet verified.
- **Evidence links:** None verified yet.
- **Remaining work:** Implement deliverables; run all listed tests; record SHA, real logs/CI URLs, unresolved risks, and acceptance decision.
