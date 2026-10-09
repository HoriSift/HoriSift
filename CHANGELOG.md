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
