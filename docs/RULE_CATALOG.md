# Versioned migration rule catalog

**Status:** 25 active, strictly matched source-backed classification rules as internal library; rule-set version `1.0.0`, each rule version `1.0.0`. Checked 2026-10-09. Rules are **advisory** and do not represent working RPC rewrites, equivalent response schemas, a public CLI, security audit, or demonstrated migration readiness. `src/rules/catalog.ts` is the executable source of truth.

## Primary sources (checked 2026-10-09)

- https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc
- https://developers.stellar.org/docs/data/apis/rpc
- https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getEvents
- https://developers.stellar.org/docs/data/apis/horizon/api-reference/structure
- https://github.com/stellar/js-stellar-sdk/blob/494cf9e26662ef4ff91afa013d5dfc37bd1f2286/src/horizon/server.ts

The official Horizon-to-RPC migration page was last updated 2026-08-18. It explicitly distinguishes direct endpoint mappings from no-direct-equivalent cases and notes that classic CAP-67 asset events require `EMIT_CLASSIC_EVENTS=true` and pre-Protocol-23 backfill can require `BACKFILL_STELLAR_ASSET_EVENTS=true`. RPC is not an historical indexer or an exact Horizon REST/HAL replacement; default retained history is approximately seven days. Validate network/provider requirements before changing an app.

## Machine-readable rules

| Rule ID | Exact normalized detector pattern | Migration kind | Candidate RPC methods (not drop-in APIs) |
|---|---|---|---|
| `horizon.http.ledger-list` | `http.GET./ledgers` | `direct` | `getLedgers` |
| `horizon.http.ledger-detail` | `http.GET./ledgers/:id` | `direct` | `getLedgers` |
| `horizon.http.transaction-submit` | `http.POST./transactions` | `direct` | `sendTransaction` |
| `horizon.http.transaction-by-hash` | `http.GET./transactions/:id` | `direct` | `getTransaction` |
| `horizon.http.account-detail` | `http.GET./accounts/:id` | `conditional` | `getLedgerEntries` |
| `horizon.http.account-list` | `http.GET./accounts` | `indexer-required` | — |
| `horizon.http.operation-list` | `http.GET./operations` | `indexer-required` | `getTransactions` |
| `horizon.http.operation-by-id` | `http.GET./operations/:id` | `no-direct-rpc-equivalent` | — |
| `horizon.http.payments-list` | `http.GET./payments` | `conditional` | `getEvents`, `getTransactions` |
| `horizon.http.effects-list` | `http.GET./effects` | `conditional` | `getEvents`, `getTransactions` |
| `horizon.http.transactions-list` | `http.GET./transactions` | `conditional` | `getTransactions` |
| `horizon.http.fee-stats` | `http.GET./fee_stats` | `conditional` | `getFeeStats`, `simulateTransaction` |
| `horizon.http.claimable-balances` | `http.GET./claimable_balances` | `indexer-required` | — |
| `horizon.http.offers` | `http.GET./offers` | `indexer-required` | — |
| `horizon.sdk.account-query` | `sdk.Horizon.Server.accounts` | `unknown` | — |
| `horizon.sdk.payments` | `sdk.Horizon.Server.payments` | `conditional` | `getEvents`, `getTransactions` |
| `horizon.sdk.operations` | `sdk.Horizon.Server.operations` | `conditional` | `getTransactions` |
| `horizon.sdk.effects` | `sdk.Horizon.Server.effects` | `conditional` | `getEvents`, `getTransactions` |
| `horizon.sdk.transactions` | `sdk.Horizon.Server.transactions` | `conditional` | `getTransactions` |
| `horizon.sdk.load-account` | `sdk.Horizon.Server.loadAccount` | `conditional` | `getLedgerEntries` |
| `horizon.sdk.submit-transaction` | `sdk.Horizon.Server.submitTransaction` | `direct` | `sendTransaction` |
| `horizon.sdk.fee-stats` | `sdk.Horizon.Server.feeStats` | `conditional` | `getFeeStats`, `simulateTransaction` |
| `horizon.sdk.streaming` | `sdk.Horizon.stream` | `conditional` | — |
| `horizon.http.hal-records` | `http.HAL._embedded.records` | `conditional` | — |
| `horizon.sdk.records` | `sdk.Horizon.records` | `conditional` | — |

`direct` means the guide lists an RPC method corresponding to the Horizon endpoint; it **does not** mean identical requests/responses, data retention, latency, or status semantics. `conditional` requires data model or provider work. `indexer-required` denotes a listing/history use case without equivalent RPC indexing. `no-direct-rpc-equivalent` explicitly forbids implying a replacement method. `unknown` is a safe fallback when the detector has insufficient specificity. Rule `severity` and `confidence` are **static triage hints** only; a proper evaluated risk engine belongs in the next milestone.

## Exact matching and conservative gaps

- Only structurally validated Phase 04 detector findings with normalized POSIX file paths and source locations can be classified. An unsupported/wrong HTTP verb or additional endpoint path **never inherits** a nearby direct mapping.
- SDK collection builders can be ambiguous: `accounts()` does not tell us whether the application later makes a single-account lookup or full account list, so its rule is `unknown`.
- SDK `payments()`, `effects()`, `operations()` and historical queries require individual migration design; their mappings are never automatic.
- A separate fallback `horizon.unmapped-pattern` maps any other syntactically safe Horizon detector pattern to `unknown`. It is **not** an active endpoint-specific rule and is not counted among the 25 active rules.
- `classifyHorizonDetection` carries forward detector unknowns and incomplete status. An empty or classified list is not evidence of readiness.
- Rules contain official URL + checked date, recommendation, notes, limitations and candidate RPC methods; the validator rejects duplicated IDs/matches, wildcards, fabricated API names, missing citations and malformed/secret-bearing text.

## Verified scope and reproducibility

Unit tests check every active rule. Separate **real detector fixtures for all 25 rules** prove the normalized patterns are emitted by implementation; integration and regressions exercise static source URLs, SDK calls, exact source locations, malformed input, dynamic calls, incorrect HTTP verbs, unrelated origins, unsafe paths and secret-safe output. See `tests/unit/rule-catalog.test.mjs`, `tests/integration/rule-fixtures.test.mjs`, `tests/integration/migration-rule-integration.test.mjs`, `tests/regression/rule-regression.test.mjs`.

Local commands: `npm run check:foundation`, `npm run typecheck`, `npm test`. CI evidence and exact commit SHA are in `docs/PHASE_BUILDS.md` and `docs/PROJECT_HANDOFF.md` once verified. The current public README intentionally omits internal milestone numbering.

## Known limitations

No rules cover custom Horizon hosts, unknown SDK method wrappers, nested Horizon resource paths not normalized into an exact rule, full application behavior, or full historic event reconstruction. Provider configuration and protocol upgrade differences require manual checks. A rule recommendation is not a guarantee of compatibility, and this project does not run the app or connect to the blockchain.