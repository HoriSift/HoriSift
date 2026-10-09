# Static Horizon migration risk analysis — internal library contract

**Status:** Implemented and tested as a library, not a CLI or a migration readiness audit. Verified 2026-10-10 against implementation commit `9bb554e0eeb33f6240786dda92930135332f37cb` and GitHub Actions run https://github.com/HoriSift/HoriSift/actions/runs/38003322270.

## Scope and intended users

`src/analysis/risk.ts` evaluates source-level Horizon dependency findings against the 25 exact, vetted rules in `src/rules/catalog.ts`. It helps maintainers prioritize investigations. It does **not** inspect production transactions, compare RPC responses, validate provider configuration, infer data-retention requirements from runtime use, replace calls automatically, or certify migration readiness.

## Publicly exported TypeScript library APIs (not npm/CLI entry points)

- `assessHorizonUsage(relativeFile, sourceText)`: syntax parser, conservative detector, exact catalog classification and triage for a caller-provided source string, without execution or network access
- `assessClassifiedDetection(classification)`: assert catalog identity, reconstruct canonical vetted metadata, and assess findings with sanitized uncertainty
- `assessHorizonRepository(root, discoveryOptions)`: bounded discovery, symlink-safe reads, detection, classification, and review-oriented risk analysis; does not modify target repositories

The assessment schema version is `1.0.0` (`RISK_SCHEMA_VERSION`), and the rule catalog version is `1.0.0` (`RULE_SET_VERSION`). These are **internal library contracts**; no stable external package interface has been released.

## Required interpretation

**Severity** estimates priority for *migration investigation*, not vulnerability impact, financial risk or a guaranteed breaking change. `high` is the minimum for an indexer-required or missing-direct-equivalent mapping, and for detected Horizon streams. Unmapped patterns receive at least `medium` to avoid silently dismissing unsupported behavior. Otherwise vetted rule severity is retained.

**Confidence** estimates certainty that the detector pattern and rule are applicable, not certainty that RPC supports the application's behavior. It remains separate from severity. Unmapped patterns must have `confidence=unknown`. High severity can coexist with medium or unknown confidence; a low-risk-looking direct mapping still requires human review.

**Mapping kinds:** `direct`, `conditional`, `indexer-required`, `no-direct-rpc-equivalent`, and `unknown` are preserved from exact catalog matches. `direct` documents the existence of a corresponding RPC method, **not** identical request/response semantics.

**Review status:** `incomplete` has highest precedence whenever the detector reports incomplete coverage, unresolved patterns or diagnostics. Otherwise one or more findings produce `review-required`; a complete scan with zero supported findings produces `no-supported-evidence`, **never** `ready` or `safe`. A complete scan can still miss custom Horizon providers or opaque wrappers.

## Report boundaries

Deterministic output includes: `schemaVersion`, `ruleSetVersion`, `status`, `triage`, `summary`, `findings`, `unknowns`, and `diagnostics`. A repository result additionally includes `root='.'` and `filesInspected`. Findings are sorted by descending severity, then lower evidence confidence first, then normalized path/line and rule ID. Each finding has a deterministic SHA-256-derived identifier from the catalog version, normalized rule, pattern and source location. Summary counts `bySeverity`, `byMappingKind`, `highestSeverity`, and `manualReviewRequired` (a count of review items, not unique engineering tasks or a risk score).

Untrusted source-location objects are copied into an allowlisted structure with only relative POSIX paths and 1-indexed start/end positions. Classification metadata is rebuilt from the vetted rule catalog; mismatched rule IDs, mapping kinds, severities, confidences or versions fail closed. Unknown codes are allowlisted, and all uncertainty/diagnostic messages are sanitized fixed text. Outputs never contain source snippets, raw HTTP URLs, credentials, file bytes, absolute machine paths, timestamps or random identifiers by design. No outbound requests are made by the evaluator.

## Validation evidence

57 risk-engine tests were added: 33 unit, 16 repository/integration and 8 regression tests. They cover every vetted rule, five mapping kinds, priority and confidence separation, duplicated/forged classifications, malformed/unsafe paths and metadata, hidden source fields, dynamic URLs, symlink escapes, resource limits, unsupported inputs, incomplete precedence and byte-for-byte deterministic results.

Verified build: https://github.com/HoriSift/HoriSift/actions/runs/38003322270, six successful OS/Node CI jobs on `9bb554e0eeb33f6240786dda92930135332f37cb` with a total of 253 passing tests, pinned TypeScript typecheck and `npm ci`. Local Node v22.16.0: `npm run typecheck`, `npm run check:foundation`, `npm test` passed (253/253). No real-application recall or precision estimate is available.

## Current limitations and next engineering work

Risk levels are deterministic static triage **heuristics**, not calibrated probabilities or application-specific impact measurements. No dynamic provider capability check, account-data reconstruction, security audit or live RPC validation is performed. Findings may be false positives and silent false negatives are possible outside the detector's supported scope. Directory changes during scanning are not an atomic snapshot. Classification inputs must be catalog-consistent; unknown observations remain unknown.

The next planned milestone is CLI integration with exact argument validation and exit-code precedence. Reporting, release hardening and independent real-repository validation will need their own verification. The public root README must not expose internal progress phase numbers.

## Authoritative API references

- Stellar migration guide: https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc (reviewed 2026-10-10)
- Stellar RPC overview: https://developers.stellar.org/docs/data/apis/rpc (reviewed 2026-10-10)
- Versioned classification rules, sources and caveats: [Rule catalog](RULE_CATALOG.md)