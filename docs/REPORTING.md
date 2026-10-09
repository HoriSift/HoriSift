# Deterministic reporting contract

**Status:** Implemented as a checkout-based development CLI and internal library. JSON v1 is the declared report schema; it does not imply npm publication, production compatibility, independent detection accuracy, or Stellar RPC migration readiness. Version: `1.0.0`.

## Entry points

- `src/reports/render.ts` provides `normalizeScanReport`, `renderScanJson`, `renderScanText`, `renderRulesJson` and `renderRulesText`.
- `src/cli/main.ts` uses the renderers for `scan` and `rules`. `--format json` always includes **all** findings; `--severity` only filters displayed text. CI decisions still inspect all findings.
- Canonical machine-readable contracts: `schemas/scan-report.v1.schema.json` and `schemas/rules-report.v1.schema.json` (JSON Schema Draft 2020-12). The schema version and catalog version are independent of the development tool version.

## V1 scan report fields

The serializer emits keys in this fixed order:

`schemaVersion`, `toolVersion`, `ruleSetVersion`, `root`, `filesInspected`, `status`, `triage`, `summary`, `findings`, `unknowns`, `diagnostics`.

- `root` is always `.`; source locations are POSIX-relative with positive 1-indexed line/column offsets. Finding IDs are deterministic hashes derived from vetted catalog evidence.
- `status` is `complete` or `incomplete`; `triage` is `review-required`, `no-supported-evidence`, or `incomplete`. A clean supported scan **does not** certify migration readiness.
- `summary` includes counts, highest severity, counts by severity, counts by mapping kind, and number of manual review items. It is rebuilt from vetted risk output, not from user-controlled summary totals.
- `findings` contain vetted rule metadata, severity and evidence confidence **as separate fields**, reason codes, advice, official references and limitations. No unreviewed endpoint mapping is invented.
- `unknowns` and `diagnostics` preserve unresolved or skipped coverage, with fixed safe messages.

Rules listings include `schemaVersion`, `toolVersion`, `ruleSetVersion`, and the canonical reviewed catalog records.

## Stable output policy

- Report JSON is UTF-8, a single canonical `JSON.stringify` record followed by exactly one LF newline. Object insertion order is intentionally fixed by code; scans contain no timestamps, random identifiers, machine absolute paths or raw source snippets. Identical normalized evidence across different checkout paths produces identical bytes.
- Text output always warns that findings are static triage only. It lists severity, confidence, relative file/position, rule ID, mapping kind, reviewed recommendation, and unresolved coverage. Severity filters change **text** only.
- Generated report output is bounded to **32 MiB per render**. Excessively large reports fail closed rather than producing partially truncated JSON or silent omissions.
- Machine report v1 is distinct from the internal source-parser/risk models; changing its schema must be deliberate and versioned. The current CLI remains an unpublished source-checkout tool, not a packaged release.

## Trust boundary and redaction

A caller-provided risk report is not serialized directly. `normalizeScanReport()` uses only its detector identity, normalized location and sanitized unknown/diagnostic codes to rebuild canonical catalog classification and risk triage. It rejects altered severity, confidence, rule ID, finding ID, totals, conflicting status, unsupported version, invalid path, duplicate findings and unsafe Unicode controls. Unknown or diagnostic messages are rebuilt from known codes, and extra source-derived fields are ignored.

The renderer never prints raw request URLs, tokens, authorization headers, source excerpts, exception stacks, absolute machine paths or arbitrary error strings by default. Source filenames and relative locations remain observable because they are needed for maintainer action; callers should consider whether names themselves are sensitive. No report upload, network request, package installation in the inspected app, auto-fix or source execution occurs during rendering.

`complete` means only that **the supported static detector** reported no known coverage gaps. Custom Horizon providers, opaque wrappers and multi-module dataflows can still be missed. Do not infer readiness or performance from a green CI result.

## Verification fixtures

- `tests/golden/scan-complete.json`, `scan-complete.txt`, `scan-incomplete.json`, `scan-incomplete.txt`, `rules.json`, `rules.txt` are committed byte-exact golden outputs. `.gitattributes` enforces LF on Windows.
- `tests/unit/report-render.test.mjs` covers canonicalization, injection, malformed input, versioning, path safety, unknowns and triage.
- `tests/unit/report-schema.test.mjs` checks JSON Schema Draft 2020-12 contracts using a deliberately limited validator for the features used by these two schemas; negative schema fixtures must fail. This is not a substitute for independent full-implementation schema tooling before release.
- `tests/integration/report-process.test.mjs` runs the real CLI and compares the stdout bytes with the golden snapshots across complete/incomplete cases and rules listing. It also validates deterministic output across different absolute checkout paths, redaction and JSON completeness.
- GitHub Actions runs the complete test suite, pinned TypeScript typecheck, a dedicated schema+golden job step, and CLI smoke tests on Ubuntu, Windows and macOS with Node.js 22 and 24. A failed initial Windows run revealed automatic CRLF checkout conversion; the `.gitattributes` fix preserves exact fixture bytes. Preserve both failed and successful run evidence in the handoff.

## Limits and future work

The JSON schema is versioned, but this is not yet a published npm package or a promise of indefinite backward compatibility. Testing against real Stellar applications, independent precision/recall, full schema-validator implementation, realistic high-volume benchmarks, packaged distribution and release authorization remain open. Security audit and responsible vulnerability contact are not yet established.

Primary Stellar migration context: https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc. See `docs/RULE_CATALOG.md` for dated references; rendering itself does not add or verify API mappings.