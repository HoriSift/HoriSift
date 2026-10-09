# HoriSift canonical engineering handoff

- **Last authored:** 2026-10-09
- **Canonical repository:** https://github.com/HoriSift/HoriSift
- **Purpose:** Local-first JS/TS static analyzer to surface Horizon API dependencies and migration work, without certifying readiness.
- **Architecture:** `docs/ARCHITECTURE.md`; decision record `docs/decisions/0001-local-first-static-analysis.md`.
- **Roadmap:** `docs/PHASE_BUILDS.md` (authoritative phases/acceptance ledger).
- **Supported scanner features:** Bounded JS/TS file discovery plus Phase 03 syntax-only TypeScript AST parsing of supported JS/TS extensions, SDK import syntax facts, local const-alias syntax facts, safe bounded UTF-8 source reading, syntax diagnostics, 1-based source positions, and dynamic-module unknowns. There is NO Horizon usage detection, proven symbol binding, installable CLI, or migration report.
- **Current engineering status:** Phase 01 VERIFIED; Phase 02 VERIFIED; Phase 03 VERIFIED (source parsing and safe reader, not Horizon detection). Phase 04 NOT STARTED.
- **Last verified implementation commit:** 1da388903496e2376fdbe5f07db27063353508cc (Phase 03 parser/reader code and CI typecheck fix).
- **CI evidence URLs:** https://github.com/HoriSift/HoriSift/actions/runs/38000404139 — SUCCESS on 1da388903496e2376fdbe5f07db27063353508cc, six Ubuntu/Windows/macOS x Node 22/24 jobs running npm ci, typecheck, foundation checks and 57 automated tests. Previous Phase 02: https://github.com/HoriSift/HoriSift/actions/runs/37998035271. Checked 2026-10-09.
- **Tests actually executed:** 2026-10-09 local Node v22.16.0: `npm run check:foundation`, `npm run typecheck`, `npm test` (57/57, includes 32 new parser/reader tests; local TS 5.8.3). `npm ci --offline` could not resolve newly pinned packages in this isolated environment; reproducible `npm ci` with TypeScript 6.0.3 and @types/node 22.15.30 succeeded in all six GitHub Actions jobs. No Horizon detection tests yet.
- **Key decisions:** One repo; static source only; no code execution/network; TypeScript Compiler API 6.0.3 pinned as parser runtime dependency; Node 22/24; import facts are syntax-only, not evidence of Horizon behavior; dynamic modules and syntax errors report incomplete.
- **Known defects:** No confirmed parser defect in implemented tests. Scope limitations: no binding resolution across scopes/modules, no Horizon method detection; no functional CLI. Race-free filesystem snapshot not guaranteed.
- **Security limitations:** Scanner threat model planned only; no secret-handling implementation exists; see `SECURITY.md`.
- **Release state:** No release. **Deployment:** None. **Stellar Wave application:** Not submitted for HoriSift.
- **Current blockers:** **Immediate:** Phase 03 acceptance met; proceed to Phase 04 Horizon usage detection with scope-aware symbols. Outstanding: migration rules, CLI, published documentation, real-app samples and secure vulnerability contact before release.
- **Next engineering step:** Begin Phase 04: identify provable SDK Horizon client patterns and supported direct HTTP requests using AST facts; include negative/ambiguous cases and line-level evidence. Do not treat syntactic imports as confirmed API calls.
- **Reproduction:** `npm ci && npm run check:foundation && npm run typecheck && npm test` on Node 22.12+ or Node 24.x; Node 22 may emit experimental strip-types warnings.

Update this handoff after every meaningful verified milestone. Do not treat prior chat summaries as live evidence.
