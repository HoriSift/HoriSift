# Testing and verification plan

**Existing automated checks:** `npm ci`, `npm run check:foundation`, `npm run typecheck`, `npm test` in a six-job Node 22/24 x Ubuntu/Windows/macOS CI matrix. 57 tests passed on verified Phase 03 SHA, including 32 new source-parser and safe-reader unit/integration/regression tests. **No Horizon detection tests or working CLI exist yet.**

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
