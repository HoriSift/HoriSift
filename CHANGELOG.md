# Changelog

All meaningful public releases will be recorded here. No public release has been published by this foundation commit; this file is intentionally not a list of implemented scanner capabilities.

## Unreleased — Source discovery

- Added read-only bounded JavaScript/TypeScript source discovery as an internal library, with deterministic paths and explicit incomplete diagnostics.
- Added 20 filesystem discovery and regression tests covering exclusions, resource limits, symlinks, malformed configurations and failure cases.
- No Horizon detector, published CLI or release yet.

## Unreleased — Source parsing

- Added safe, bounded UTF-8 source reading and TypeScript AST parsing for JavaScript and TypeScript modules.
- Records limited Stellar SDK module-import and const-alias syntax facts, dynamic-module unknowns, accurate source positions, and safe malformed-input diagnostics.
- Pinned TypeScript 6.0.3, Node typings, reproducible installation and typecheck in CI.
- Added 32 parser/read-path tests (57 automated tests total, verified on the Phase 03 implementation commit).
- No Horizon detection, CLI, package release, or web deployment yet.

## Unreleased — Horizon usage detection

- Added a conservative source-only SDK/HTTP detector with lexical shadowing safeguards, trusted Horizon.Server constructor and selected method recognition, static Horizon HTTP fetch/Axios patterns, and provenance-tied response-shape observations.
- Added explicit unknowns for dynamic Horizon URLs and computed calls, without exposing source content, HTTP credentials or request bodies.
- Added 56 unit/integration/regression tests (113 total), including cross-file repository scan integration. Verified on Ubuntu, Windows and macOS with Node 22/24.
- Fixed dropped Node typings detected by an initially failed TypeScript 6 CI run; the corrected commit is green.
- Migration rules, severity, CLI, npm release and hosted site remain unimplemented.

## Unreleased — Versioned migration guidance catalog

- Implemented 25 exact-match, versioned, dated-official-source-backed rules with five classification kinds and explicit RPC candidate methods, caveats and unknown fallback.
- Implemented strict catalog schema validation and deterministically ordered, sanitized classification output without executing target source.
- Added 83 unit, integration and regression tests, including a real detector fixture for every activated rule (196 total tests).
- Corrected uncertain dynamically composed Horizon URL detection to preserve incomplete diagnostics.
- No CLI, final risk evaluation, npm release or actual migration verification yet.

## Unreleased — Static migration risk triage

- Implemented conservative, explainable, read-only migration investigation scoring, with severity distinct from evidence confidence, deterministic stable finding identifiers, and explicit incomplete/unknown precedence.
- Prioritizes indexer-dependent and no-direct-RPC-equivalent findings without claiming production impact or automatic migration success.
- Sanitizes source locations and diagnostic metadata, rejects forged catalog classifications and unsafe unknown codes.
- Added 57 unit/integration/regression tests (253 total) and verified six GitHub Actions matrix jobs on the matching implementation SHA.
- No released CLI, standalone report renderer, production migration verification, hosted site or npm publication.

## Unreleased — Development CLI

- Implemented checkout-only `scan`, `rules`, help and version executable with strict option validation, text/JSON output and explicit CI exit-code precedence.
- Added portable JS shim to launch local TypeScript source using Node's strip-types support, with no additional third-party CLI runtime dependency.
- Added 55 CLI unit, end-to-end subprocess and regression tests (308 total), including missing arguments, empty sources, symlink exclusions, incomplete-scan overrides and secret-safe output.
- Verified six cross-platform GitHub Actions jobs with CLI help/version/rule-list smoke checks.
- No npm publication, bundled release, dedicated final report engine or actual application migration validation yet.

## Unreleased — Versioned reporting engine

- Added dedicated safe canonical text and JSON renderers with versioned Draft 2020-12 scan/rules schemas, stable key order, deterministic IDs, full JSON findings and explicit incomplete triage.
- Rebuilds vetted risk/classification metadata, drops secret-bearing extra fields, rejects forged severity/confidence/locations and sanitizes diagnostics instead of exposing source or exception text.
- Added six byte-exact golden fixtures and 64 schema, rendering, CLI-process and regression tests (372 total); limits each report to 32 MiB.
- Fixed Windows CRLF checkout differences with `.gitattributes` LF policy; the initial failing Windows CI was retained and the corrected six-job CI passed.
- Still unpublished; representative application accuracy, full independent schema validation, stress testing and release hardening remain outstanding.

## Unreleased — Adversarial test hardening

- Added six synthetic Stellar application-like fixtures (wallet, payment service, history indexing, unresolved dynamic request, malformed and misleading source) with explicit provenance; did not claim real-app benchmarking.
- Added 55 application-corpus, deterministic-report and adversarial property regression tests (427 in the standard suite).
- Added a separate eight-case bounded stress suite, including 20,001 simulated file entries, 100,005 simulated directory entries, 256 actual test files, Unicode/encoding, symlink cycles and size/depth boundaries.
- Runs the full standard suite on Ubuntu/Windows/macOS × Node 22/24 and dedicated stress gates on Ubuntu/Node 24, with actual measurements and limits documented.
- No public npm package, representative real-application accuracy study, peak memory guarantee, or claim of migration readiness.

## Unreleased — Reproducible CI quality gates

- Pinned official checkout/setup-node GitHub Actions to full verified commits, disabled persisted credentials and retained read-only workflow permissions and all six OS×Node matrix jobs.
- Added npm audit high/critical gate, locked `npm ci --ignore-scripts`, LF/UTF-8/JSON formatting policy, security-focused TypeScript AST lint and workflow/lock integrity checks without new dependencies.
- Added strict TypeScript emitted-JS build and compiled CLI smokes, with 24 isolated deliberately failing input checks (missing-lock npm ci, invalid type, unsafe imports, mutable action refs, insecure permissions, whitespace and invalid JSON).
- Existing 427 standard tests and Ubuntu Node24 eight stress tests all remain enforced. Initial TS6-only negative-fixture failure was fixed using a temporary isolated tsconfig; the successful six-job CI is linked in the handoff.
- No npm release, representative real-app migration study, full external lint/SAST/security audit or published binary.

## Unreleased — Pinned public-source examples and independent source observations

- Added four original source snapshots from three third-party public Stellar codebases at immutable commits, retaining upstream MIT/Apache notices and Git-blob/SHA-256 provenance.
- Added offline source-checkout example runner, four authentic byte-locked scan JSON reports and 15 integrity, process, result and false-negative regression tests (442 standard tests total).
- Verified Axelar and Soroswap Horizon constructor detection with dynamic source URLs marked incomplete; a non-Horizon upstream control stayed empty.
- **Recorded a confirmed historical-SDK false negative:** legacy `StellarSdk.Server` source incorrectly produces no supported evidence, tracked at https://github.com/HoriSift/HoriSift/issues/1.
- Added dedicated public example CI step on Ubuntu/Windows/macOS × Node 22/24; no npm release, full public app scan, measured population accuracy, or upstream approval claimed.
