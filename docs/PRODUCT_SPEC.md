# HoriSift product specification

**Product:** Local-first, CI-usable static analyzer to find Horizon dependencies before moving Stellar applications to RPC. This is a specification, not a claim of shipped functionality.

## Target users and job to be done

JavaScript and TypeScript maintainers of payment apps, wallets, and Stellar backend services need to inventory Horizon usage and determine which migration work requires code refactoring, extra indexing, or manual investigation.

## Supported first-release inputs (planned)

- Source extensions: `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts`, `.cts`. Respect ignored vendor/build folders, bounded path traversal, and repository-local rules; no execution.
- High-confidence SDK clients constructed from verified imports of `@stellar/stellar-sdk` and supported legacy `stellar-sdk` imports; resolve namespace/named imports, direct aliases, and stable local variable bindings. Avoid claiming full interprocedural flow analysis.
- Recognizable calls on Horizon clients: for example collections for accounts, payments, operations and effects, terminal `.call()`, `.stream()`, and response traversal. Exact SDK call patterns are subject to version-specific verification and fixture testing before enabling rules.
- Direct `fetch()` and supported Axios HTTP calls whose *static* host/base URL and method/path can be tied to Horizon; include HAL pagination and `_embedded.records` reads where dataflow is provable.
- A dynamic URL, re-export, wrapper, mutation, unresolved alias, or unknown SDK method must become an **unknown** or supported diagnostic, not a fabricated match.

## Explicit exclusions

No direct RPC network calls, source execution, dependencies installation, AST-based auto-fixes, wallet connection, signing, live migration success checks, non-JS/TS languages, server/indexer implementation, or certainty for opaque wrappers.

## Proposed CLI contract (not yet implemented)

- `horisift scan <path> [--format text|json] [--severity info|low|medium|high] [--fail-on info|low|medium|high] [--allow-incomplete]`
- `horisift rules [--format text|json]`
- `horisift --help`, `horisift --version`

`--severity` filters displayed findings only; `--fail-on` sets CI threshold over all detected findings. Report JSON always includes all findings to prevent accidental data loss through presentation filtering. No output snippet containing source text by default.

## Exit codes (planned)

| Code | Meaning |
|---|---|
| 0 | Complete scan and no findings at/above `--fail-on` threshold |
| 1 | Complete scan, findings at/above CI threshold |
| 2 | CLI usage, invalid path argument, invalid configuration |
| 3 | Fatal runtime, filesystem or resource-limit error preventing trustworthy scan |
| 4 | Scan incomplete/indeterminate because relevant files or patterns could not be resolved, unless `--allow-incomplete` is explicitly set |

Precedence: fatal (3) or invalid usage/config (2) > incomplete (4) > findings (1) > success (0). Even when allowed, incomplete status remains explicit in JSON; `--allow-incomplete` must never imply readiness. Empty repo => incomplete, not success.

## Product success metric (to measure after implementation)

On a documented public evaluation corpus, track rule-level precision, fixture recall, reproducible runtime/resource use, and actionable feedback. There is no measured adoption or detection performance yet.
