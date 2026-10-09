# Testing and verification plan

**Existing automated checks:** Foundation tests and file-discovery tests (`npm test`; `npm run check:foundation`). Twenty discovery and regression cases cover extensions, exclusions, symlinks, permission errors, limits, Unicode, and path escapes. **No Horizon detection tests or working CLI exist yet.** File enumeration does not establish migration readiness.

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
