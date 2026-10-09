# HoriSift canonical engineering handoff

- **Last authored:** 2026-10-09
- **Canonical repository:** https://github.com/HoriSift/HoriSift
- **Purpose:** Local-first JS/TS static analyzer to surface Horizon API dependencies and migration work, without certifying readiness.
- **Architecture:** `docs/ARCHITECTURE.md`; decision record `docs/decisions/0001-local-first-static-analysis.md`.
- **Roadmap:** `docs/PHASE_BUILDS.md` (authoritative phases/acceptance ledger).
- **Supported scanner features:** Bounded JS/TS file discovery, strict source reads, AST parser, conservative Horizon SDK/HTTP detector, and internal versioned migration catalog (`src/rules/catalog.ts`) with 25 exact source-backed rules plus fail-closed unmapped fallback. Each rule includes category, dated official citations, candidate RPC methods, recommendation, limitations and static triage hints. No evaluated risk engine, public CLI, final report renderer or release.
- **Current engineering status:** Phases 01–05 VERIFIED within their declared scopes. Phase 06 NOT STARTED. Catalog advice is NOT proof of app migration safety.
- **Last verified implementation commit:** 06e9651fad5cd51df27d488117e8a53d527b3d21 (Phase 05 rule catalog, exact classification, source heuristic fix and tests). Subsequent documentation commit does not modify scanner code.
- **CI evidence URLs:** https://github.com/HoriSift/HoriSift/actions/runs/38002363095 — SUCCESS on 06e9651fad5cd51df27d488117e8a53d527b3d21, six Ubuntu/Windows/macOS × Node 22/24 jobs, 196 tests and pinned TypeScript typecheck (2026-10-09). Phase 04 prior evidence: https://github.com/HoriSift/HoriSift/actions/runs/38001525787. Phase 03: https://github.com/HoriSift/HoriSift/actions/runs/38000560360.
- **Tests actually executed:** 2026-10-09 local Node v22.16.0/TS 5.8.3: `npm run check:foundation`, `npm run typecheck`, `npm test` (196/196). 83 new rule/schema/fixture/regression tests including 25 real-detector fixtures (one per activated rule), malformed/unsafe catalog input, incorrect HTTP verbs, unknown fallback and secret redaction. GitHub CI used pinned TypeScript 6.0.3 and npm ci; all six OS×Node jobs passed on the same implementation commit.
- **Key decisions:** Local-only static analysis without running target code/network. Match exact sanitized detector evidence to 25 versioned source-backed classifications; no partial/closest-path matches, unsupported RPC method names or invented equivalences. Preserve detector unknowns/incomplete statuses. Mapped methods are candidates, not replacements. Original SDK source SHA 494cf9e26662ef4ff91afa013d5dfc37bd1f2286; official migration guide last updated 2026-08-18, checked 2026-10-09.
- **Known defects:** No known failure in verified 196 test suite; independent real-world accuracy not measured. Detector still misses some custom Horizon hosts, Axios instances and cross-file flows, and does not guarantee race-free filesystem snapshots. Catalog rule defaults are not risk evaluation. No CLI or production migration tests.
- **Security limitations:** Scanner threat model planned only; no secret-handling implementation exists; see `SECURITY.md`.
- **Release state:** No release. **Deployment:** None. **Stellar Wave application:** Not submitted for HoriSift.
- **Current blockers:** **Immediate:** Phase 05 verified; next Phase 06 — risk and uncertainty evaluator. Outstanding: final report schema, CLI, real-app validation, secure vulnerability contact, release review.
- **Next engineering step:** Begin Phase 06: implement risk evaluation separately from rule defaults; distinguish severity from confidence; preserve all unknowns and incomplete diagnostics; add negative/security/regression and CI checks. Do not claim app migration readiness.
- **Reproduction:** `npm ci && npm run check:foundation && npm run typecheck && npm test` on Node 22.12+ or Node 24.x; Node 22 may emit experimental strip-types warnings.

Update this handoff after every meaningful verified milestone. Do not treat prior chat summaries as live evidence.
