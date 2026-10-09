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
