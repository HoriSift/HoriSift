# HoriSift canonical engineering handoff

- **Last authored:** 2026-10-10
- **Canonical repository:** https://github.com/HoriSift/HoriSift
- **Purpose:** Local-first JS/TS static analyzer to surface Horizon API dependencies and migration work, without certifying readiness.
- **Architecture:** `docs/ARCHITECTURE.md`; decision record `docs/decisions/0001-local-first-static-analysis.md`.
- **Roadmap:** `docs/PHASE_BUILDS.md` (authoritative phases/acceptance ledger).
- **Supported scanner features:** Bounded discovery, safe reads, AST parsing, conservative Horizon SDK/HTTP detection, 25 reviewed migration rules, deterministic risk triage and checkout-based development CLI (`bin/horisift.mjs`, `src/cli/main.ts`). Includes scan/rules/help/version, strict args, text/JSON, incomplete precedence and threshold filtering. No published npm release or final standalone report engine.
- **Current engineering status:** Phases 01–07 VERIFIED within declared boundaries. Phase 08 report renderer NOT STARTED. Clean scans do not certify migration readiness.
- **Last verified implementation commit:** d9fcb88d37168492bf065cf749d795fe47da7204 (Phase 07 executable, CI smoke and 55 CLI tests).
- **CI evidence URLs:** https://github.com/HoriSift/HoriSift/actions/runs/38004114440 — SUCCESS on d9fcb88d37168492bf065cf749d795fe47da7204, 6/6 jobs Ubuntu/Windows/macOS × Node 22/24; pinned npm ci, typecheck, foundation validation, 308 tests and CLI smoke; checked 2026-10-10. Prior Phase 06: https://github.com/HoriSift/HoriSift/actions/runs/38003322270.
- **Tests actually executed:** 2026-10-10 local Node v22.16.0: npm test 308/308 (55 CLI additions), npm run typecheck, npm run check:foundation, CLI help/version and self-scan passed. GitHub verified six jobs on exact source commit including CLI process integration tests. No production app benchmark or npm package published.
- **Key decisions:** CLI uses a strict dependency-free parser instead of planned commander, avoiding extra runtime dependencies. Portable JS executable launches checked-in TypeScript with Node --experimental-strip-types for Node 22/24; bundled build later. --severity affects text only, JSON retains all findings; --fail-on is opt-in and checks ALL findings; incomplete exit 4 overrides threshold 1 unless expressly allowed. Usage errors 2, fatal unexpected errors 3, sanitized stderr. No target execution or uploads.
- **Known defects:** No failures in 308 verified tests. Node 22 emits optional experimental TypeScript warnings; current CLI is development checkout tooling, not a registry install or stable final report API. Detector coverage and real-world accuracy remain limited; no atomic filesystem snapshot.
- **Security limitations:** Risk output sanitizer allowlists paths, locations, unknown/diagnostic codes and rebuilds rule metadata; integration tests cover secret injection. No comprehensive security audit or production threat validation; see `SECURITY.md`.
- **Release state:** No release. **Deployment:** None. **Stellar Wave application:** Not submitted for HoriSift.
- **Current blockers:** Phase 07 acceptance verified. Next: Phase 08 stable deterministic text/JSON report engine, schema/golden tests and security validation. Public distribution, benchmark evidence, vulnerability contact and release approval remain outstanding.
- **Next engineering step:** Implement Phase 08 independent report renderers and schema tests, preserve unknown/incomplete evidence, and validate deterministic secret-free output. No public release without explicit authorization.
- **Reproduction:** npm ci && npm run check:foundation && npm run typecheck && npm test && npm run cli -- --help && npm run cli -- rules --format json. Source checkout scan: npm run cli -- scan <path> --format json. See docs/CLI_USAGE.md.

Update this handoff after every meaningful verified milestone. Do not treat prior chat summaries as live evidence.
