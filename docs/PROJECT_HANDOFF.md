# HoriSift canonical engineering handoff

- **Last authored:** 2026-10-10
- **Canonical repository:** https://github.com/HoriSift/HoriSift
- **Purpose:** Local-first JS/TS static analyzer to surface Horizon API dependencies and migration work, without certifying readiness.
- **Architecture:** `docs/ARCHITECTURE.md`; decision record `docs/decisions/0001-local-first-static-analysis.md`.
- **Roadmap:** `docs/PHASE_BUILDS.md` (authoritative phases/acceptance ledger).
- **Supported scanner features:** Bounded discovery and safe reads; AST parser; conservative Horizon SDK/HTTP detector; 25 source-backed exact migration rules plus unknown fallback; internal static migration risk engine (`src/analysis/risk.ts`) with independent severity and confidence, explainable reason codes, deterministic IDs, prioritized findings, sanitized diagnostics and incomplete-scan precedence. No released CLI, final rendering engine, production migration verification or release.
- **Current engineering status:** Phases 01–06 VERIFIED within their bounded scopes. Phase 07 CLI is NOT STARTED. Static triage is not a readiness verdict.
- **Last verified implementation commit:** 9bb554e0eeb33f6240786dda92930135332f37cb (Phase 06 risk engine and 57 new tests; current documentation-only commit follows).
- **CI evidence URLs:** https://github.com/HoriSift/HoriSift/actions/runs/38003322270 — SUCCESS on 9bb554e0eeb33f6240786dda92930135332f37cb, 6/6 jobs Ubuntu/Windows/macOS × Node 22/24, 253 tests, npm ci, pinned TypeScript 6 typecheck and foundation validation (checked 2026-10-10). Previous Phase 05 run: https://github.com/HoriSift/HoriSift/actions/runs/38002363095.
- **Tests actually executed:** 2026-10-10 local Node v22.16.0/TS5.8.3: `npm run typecheck`, `npm run check:foundation`, `npm test` (253/253); 57 new risk tests: 33 unit, 16 end-to-end integration, 8 regression. Cases include every catalog rule, deterministic results, tampered metadata, symlink escapes, malicious diagnostic/source properties, duplicate locations, incomplete precedence, and source non-execution. Pinned TS6/npm ci checked in all six GitHub jobs on implementation SHA.
- **Key decisions:** Risk is migration-work triage, not financial or security risk, and not a probability score. Severity and evidence confidence separate. Indexer and missing-direct-equivalent findings prioritize high; unknown mapping stays unknown; any coverage gaps force incomplete; complete zero findings says no-supported-evidence, not ready. Canonical vetted rules revalidated to prevent spoofed severity, message and location leaks. Primary Stellar guide checked 2026-10-10.
- **Known defects:** No known failure in verified 253-test suite. Unmeasured real-repo precision/recall and static triage heuristics are NOT calibrated impacts. Detector still misses some custom hosts, Axios instances and cross-file flows; filesystem traversal is not an atomic snapshot; no CLI or real production migration test.
- **Security limitations:** Risk output sanitizer allowlists paths, locations, unknown/diagnostic codes and rebuilds rule metadata; integration tests cover secret injection. No comprehensive security audit or production threat validation; see `SECURITY.md`.
- **Release state:** No release. **Deployment:** None. **Stellar Wave application:** Not submitted for HoriSift.
- **Current blockers:** **Immediate:** Phase 06 verified; next Phase 07 CLI and documented exit-code handling. Outstanding: final user-facing report schema/renderers, real-app validation, secure vulnerability contact, release review.
- **Next engineering step:** Begin Phase 07 CLI for scan/rules/help, validated options and exact exit precedence. Keep incomplete separate from threshold findings, and do not represent a clean scan as migration readiness.
- **Reproduction:** `npm ci && npm run check:foundation && npm run typecheck && npm test` on Node 22.12+ or Node 24.x; Node 22 may emit experimental strip-types warnings.

Update this handoff after every meaningful verified milestone. Do not treat prior chat summaries as live evidence.
