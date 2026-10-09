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
- **Status:** NOT STARTED.
- **Verified implementation commit:** Not yet verified.
- **Evidence links:** None verified yet.
- **Remaining work:** Implement deliverables; run all listed tests; record SHA, real logs/CI URLs, unresolved risks, and acceptance decision.

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
- **Status:** NOT STARTED.
- **Verified implementation commit:** Not yet verified.
- **Evidence links:** None verified yet.
- **Remaining work:** Implement deliverables; run all listed tests; record SHA, real logs/CI URLs, unresolved risks, and acceptance decision.

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
- **Status:** NOT STARTED.
- **Verified implementation commit:** Not yet verified.
- **Evidence links:** None verified yet.
- **Remaining work:** Implement deliverables; run all listed tests; record SHA, real logs/CI URLs, unresolved risks, and acceptance decision.

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
- **Status:** NOT STARTED.
- **Verified implementation commit:** Not yet verified.
- **Evidence links:** None verified yet.
- **Remaining work:** Implement deliverables; run all listed tests; record SHA, real logs/CI URLs, unresolved risks, and acceptance decision.

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
- **Status:** NOT STARTED.
- **Verified implementation commit:** Not yet verified.
- **Evidence links:** None verified yet.
- **Remaining work:** Implement deliverables; run all listed tests; record SHA, real logs/CI URLs, unresolved risks, and acceptance decision.

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
- **Status:** NOT STARTED.
- **Verified implementation commit:** Not yet verified.
- **Evidence links:** None verified yet.
- **Remaining work:** Implement deliverables; run all listed tests; record SHA, real logs/CI URLs, unresolved risks, and acceptance decision.

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
- **Status:** NOT STARTED.
- **Verified implementation commit:** Not yet verified.
- **Evidence links:** None verified yet.
- **Remaining work:** Implement deliverables; run all listed tests; record SHA, real logs/CI URLs, unresolved risks, and acceptance decision.

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
- **Status:** NOT STARTED.
- **Verified implementation commit:** Not yet verified.
- **Evidence links:** None verified yet.
- **Remaining work:** Implement deliverables; run all listed tests; record SHA, real logs/CI URLs, unresolved risks, and acceptance decision.

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
