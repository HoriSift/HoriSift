# Testing and verification plan

**Existing automated checks:** `npm ci`, `npm run check:foundation`, `npm run typecheck`, `npm test` in a six-job Node 22/24 x Ubuntu/Windows/macOS CI matrix. 253 tests passed on verified Phase 06 implementation SHA, including 57 new risk engine unit, integration and regression tests. No public CLI, real migration verification or measured production accuracy.

## Planned test layers

1. Unit: rules validation, AST node matching, stable IDs, severity ordering, path canonicalization, redaction and exit code precedence.
2. Integration: supported JS/TS repositories end-to-end, text and JSON parity, declared unknowns, real CLI exit codes.
3. Regression/golden: curated false-positive and historical bug fixtures with deterministic report snapshot comparison.
4. Stress/security: size and depth budgets, path escape and symlink loops, permission failures, malformed Unicode, parser recovery, no network and no code execution.
5. Cross-platform CI: Linux, Windows, macOS with Node 24, plus Node 22 compatibility; package installation with `npm ci`, typecheck, test, build and smoke commands when implemented.

## Fixture matrix (to implement as behavior becomes real)

| Scenario | Expected policy |
|---|---|
| Imported Horizon client aliased or renamed | Detect only with proven binding; accurate location |
| Multiple Horizon clients | No missing or duplicated findings |
| Comments and harmless string literals mentioning `/payments` | No executable-call finding |
| Direct static HTTP Horizon call | Detect when host/path and method are provable |
| Dynamic URL, wrapper, re-export, unknown method | Record unknown when relevant; do not guess |
| Empty repository or only unsupported files | Incomplete, never “ready” |
| Invalid JS/TS | Diagnostics, no crash; incomplete where relevant |
| Very large file, deep tree, too many files | Bounded resource failure/incomplete, not hang |
| Symlink to outside root or loop | Never follow, record diagnostic |
| Permission denied | Report incomplete, no silent success |
| Unicode filenames and Windows paths | Portable POSIX normalized report paths |
| Malformed rule metadata | Fail rule validation before analysis |
| Secrets within literals or query strings | Never print raw source snippets or secret values |
| Repeated runs on same source | Byte-identical canonical JSON |

## Evidence expectations

At each milestone record exact commands actually run and their conclusions, local Node version, Git commit SHA, per-platform GitHub Actions links, failed tests and open issues. No green claim can substitute for a run link on the same commit.

## Parser and read-path verification (2026-10-09)

Implementation: `src/parser/parse.ts` and `src/parser/read.ts`. Tests: `tests/unit/parser.test.mjs`, `tests/integration/parser-read.test.mjs`, `tests/regression/parser-regression.test.mjs`. Evidence: https://github.com/HoriSift/HoriSift/actions/runs/38000404139 at 1da388903496e2376fdbe5f07db27063353508cc — 6/6 matrix jobs passed, including pinned npm install and TypeScript 6 typecheck. Local Node 22.16.0 using available TypeScript 5.8.3 also passed 57 tests and typecheck; `npm ci --offline` with new dependencies unavailable locally, but GitHub `npm ci` passed.

Positive cases: ESM imports/aliases, CommonJS require destructuring, TS import-equals, all eight JS/TS source extensions, safe discovery-to-parse flow, UTF-8 BOM, 1-indexed locations, Unicode filenames and deterministic output. Negative/edge cases: misleading comments/strings, type-only imports, dynamic module expressions, malformed JS/TS, unsafe paths, symlink components and root, outside-root paths, invalid UTF-8/NUL, file-size boundaries, simulated errors, and explicit incomplete diagnostics without raw secret data.

Known scope: syntactic import/alias facts are not proof of binding resolution or Horizon method usage. File-system metadata checks are not an atomic snapshot. Phase 04 must test scope shadowing, reassignment, wrappers and uncertain endpoints explicitly.

## Horizon detection verification — 2026-10-09

`tests/unit/horizon-detector.test.mjs`, `tests/integration/horizon-http.test.mjs`, `tests/integration/horizon-repository.test.mjs`, and `tests/regression/horizon-detector-regression.test.mjs` add 56 detector cases (113 total tests including Phases 01–03). Tests check proven SDK imports/aliases/constructors, methods, streams, supported Horizon fetch/Axios calls, HTTP methods and URL path normalization, response provenance, deterministic ordering, exact 1-based line positions, host impersonation rejection, shadowed identifiers, import-only nonmatches, invalid syntax, dynamic URLs/methods, Windows-compatible read/discovery integration, outside-root symlinks and resource budgets. No source text, API keys, account IDs or POST bodies are serialized by detector output. Real-world precision and false negative rates have NOT been measured.

Local Node 22.16.0: `npm run typecheck` and `npm test` passed (113/113); this local environment uses TS 5.8.3. GitHub Actions: https://github.com/HoriSift/HoriSift/actions/runs/38001525787 completed SUCCESS on 5a8106f62806749363d694da06dde8a4a474d8a6 with pinned TS 6.0.3, `npm ci`, typecheck, foundation and all 113 tests on Ubuntu, Windows, macOS with Node 22 and 24 (6/6). An earlier failed CI run on original detector SHA was caused by inadvertently replacing the explicit `types:["node"]` field; fixed on the verified implementation SHA. No claims of network tests, production adoption or RPC equivalence are made.

## Versioned migration catalog verification — 2026-10-09

25 active exact detector-pattern rules plus an unknown fallback; all 25 are covered by real detector-to-classifier fixture tests. Test paths: `tests/unit/rule-catalog.test.mjs`, `tests/integration/rule-fixtures.test.mjs`, `tests/integration/migration-rule-integration.test.mjs`, `tests/regression/rule-regression.test.mjs`. Negative tests include unsupported/wrong HTTP methods, unrecognized endpoints, wrong SDK symbols, unsafe paths, duplicate pattern/ID, forged RPC method, missing source citation, secret-bearing metadata, dynamic URL, malformed source and deterministic ordering. We fixed the Phase 04 dynamic literal prefix heuristic to report uncertain Horizon URLs as incomplete rather than silently complete.

Local Node v22.16.0/TS 5.8.3: `npm run check:foundation`, `npm run typecheck`, `npm test` all passed (196/196). GitHub verified https://github.com/HoriSift/HoriSift/actions/runs/38002363095 on 06e9651fad5cd51df27d488117e8a53d527b3d21 — six successful matrix jobs (Ubuntu/Windows/macOS × Node 22/24) running `npm ci`, pinned TypeScript 6.0.3 typecheck, foundation checks and tests. No external mainnet integration tests, independent accuracy benchmark, migration approvals or live transaction testing.

## Risk and uncertainty evaluator — verification on 2026-10-10

Risk engine code: `src/analysis/risk.ts`. Added `tests/unit/risk-analysis.test.mjs` (33 tests), `tests/integration/risk-repository.test.mjs` (16), and `tests/regression/risk-regression.test.mjs` (8). Every versioned rule is exercised with separate severity/confidence expectations; boundaries include forged downgrade, contradictory mapping, duplicate sources, unsafe paths, extra secret-bearing fields, unknown-code prototype injection, dynamic HTTP, syntax failure, resource exhaustion, ignored trees and outside-root symlinks. Whole-repo examples establish true discovery→read→detect→classify→assess flow and stable sorting without executing application code.

Local Node v22.16.0/TypeScript 5.8.3: `npm run typecheck`, `npm run check:foundation` and `npm test` succeeded, 253/253. GitHub Actions https://github.com/HoriSift/HoriSift/actions/runs/38003322270 passed for 9bb554e0eeb33f6240786dda92930135332f37cb on Ubuntu/Windows/macOS × Node 22/24 (six jobs), including pinned TypeScript 6.0.3 typechecking, `npm ci`, foundation validation and all tests. No external mainnet tests, measured real-world accuracy, audited migration outcomes or grant outcomes.
