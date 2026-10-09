# HoriSift canonical engineering handoff

- **Last authored:** 2026-10-09
- **Canonical repository:** https://github.com/HoriSift/HoriSift
- **Purpose:** Local-first JS/TS static analyzer to surface Horizon API dependencies and migration work, without certifying readiness.
- **Architecture:** `docs/ARCHITECTURE.md`; decision record `docs/decisions/0001-local-first-static-analysis.md`.
- **Roadmap:** `docs/PHASE_BUILDS.md` (authoritative phases/acceptance ledger).
- **Supported scanner features:** Phase 02 bounded JS/TS source discovery library (eight extensions, deterministic relative paths, symlink skipping, resource limits, literal exclusions, explicit incomplete diagnostics). No AST parser, Horizon detection, CLI, or migration report yet.
- **Current engineering status:** Phase 01 VERIFIED. Phase 02 VERIFIED for bounded source file discovery and regression tests; this does not establish functional Horizon detection.
- **Last verified implementation commit:** ccfdcd790697f9861a65237cc8c6aec0275feeee (Phase 02 code and tests; verified on GitHub Actions 37998035271). Later evidence/documentation commits are not scanner implementation changes.
- **CI evidence URLs:** https://github.com/HoriSift/HoriSift/actions/runs/37998035271 — SUCCESS on ccfdcd790697f9861a65237cc8c6aec0275feeee, 6/6 jobs: macOS/Windows/Ubuntu × Node 22/24. Phase 01 evidence: https://github.com/HoriSift/HoriSift/actions/runs/37997210979 (checked 2026-10-09).
- **Tests actually executed:** 2026-10-09 local Node v22.16.0: `npm ci --offline`, `npm run check:foundation`, `npm test` (25/25 tests passed: five foundation, twenty discovery/regression); local `tsc --noEmit` using globally available TypeScript/Node typings passed, but typecheck is not pinned or run in CI. GitHub Actions six jobs passed on the Phase 02 code SHA. No Horizon detection tests yet.
- **Key decisions:** One repo; static source only; conservative uncertainties; no code execution or network; Node 22/24; AST via TS Compiler API when implemented.
- **Known defects:** Not yet evaluated; no functional scanner is present.
- **Security limitations:** Scanner threat model planned only; no secret-handling implementation exists; see `SECURITY.md`.
- **Release state:** No release. **Deployment:** None. **Stellar Wave application:** Not submitted for HoriSift.
- **Current blockers:** **Immediate:** Phase 02 acceptance met; proceed to Phase 03 source parsing. Outstanding: pinned TypeScript dependency/typecheck CI, parser, detector and rules, safe source-reader revalidation against filesystem races, and disclosure contact before release.
- **Next engineering step:** Begin Phase 03 AST source parsing with malformed-input handling and symbol/location tests; revalidate source file containment at read time. Do not claim Horizon detection until implemented, tested, and verified.
- **Reproduction:** `npm ci && npm run check:foundation && npm test` on Node 22.12+ or Node 24.x. The test script enables native TypeScript stripping; Node 22 may emit an experimental warning.

Update this handoff after every meaningful verified milestone. Do not treat prior chat summaries as live evidence.
