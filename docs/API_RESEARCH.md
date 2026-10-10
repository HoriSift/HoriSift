# API and ecosystem verification — 2026-10-09

All source URLs below were checked on 2026-10-09. The current Stellar documentation pages are unversioned live pages; this dated summary is not a pinned historical copy. Re-check sources before activating individual migration rules.

| Verified primary source | Verified behavior | Consequence for HoriSift | Limitation |
|---|---|---|---|
| https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc | Horizon is REST/HAL; Stellar RPC uses JSON-RPC. The endpoint table contains mapped, conditional, and absent-equivalent cases. | Record compatibility category, not fake one-to-one replacements. | Mapping list evolves; response semantics still need testing. |
| https://developers.stellar.org/docs/data/apis/rpc | Stellar RPC is a bounded-history gateway, not a general historical indexer or direct Horizon drop-in. | Flag historical-index dependency as design work. | Provider retention/configuration can differ. |
| https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getEvents | RPC events are range-filtered; classic events require provider configuration; event history is bounded. | Do not call `getEvents` a full replacement for effects/payments. | Check `EMIT_CLASSIC_EVENTS`, backfill config and protocol period. |
| https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getTransactions | Transaction pagination cannot reach outside retained ledger range. | Classify long-range history workflows cautiously. | Provider retention varies. |
| https://developers.stellar.org/docs/data/apis/horizon/api-reference/structure | Horizon returns HAL resources, with pagination and event streaming. | Future rules may inspect proven HAL field access and `.stream()`. | Need AST dataflow proof for real dependency. |
| https://github.com/stellar/js-stellar-sdk | The JS SDK contains both Horizon and RPC layers, and has SDK-major-version migration guides. | Match imported Horizon clients, not merely a `stellar-sdk` dependency. | Major SDK APIs can change; pin fixture version assumptions. |
| https://github.com/Event-Parity/eventparity-engine | Describes comparing classic payment operation records from Horizon and RPC with bounded ledger coverage. | HoriSift focuses on static code migration inventory and does not duplicate live data parity comparison. | Related project's README claims are self-reported, not independent runtime verification. |
| https://github.com/nodejs/Release | Node 24.x is Active LTS and Node 22.x Maintenance LTS on this check date. | Node 22/24 compatibility policy for initial foundation. | Re-check at next Node transition. |

## Open technical questions before detection rules become active

- Which actual Stellar JS SDK major versions and import spellings are supported by our fixture corpus?
- How reliably can we resolve aliases and response properties without full type checking?
- Which static direct HTTP conventions are safe to classify without false positives?
- How should severity prioritize architectural work without claiming migration certainty?
- Can bounded AST parsing and symlink policies handle malicious repositories on all supported platforms?

25 exact source-backed advisory migration rules are now implemented and verified with individual synthetic and real detector fixtures. Independent real-world accuracy/recall and actual migration outcomes have NOT been measured.

## SDK method/source validation for detector (checked 2026-10-09)

- The upstream Horizon.Server implementation at https://github.com/stellar/js-stellar-sdk/blob/494cf9e26662ef4ff91afa013d5dfc37bd1f2286/src/horizon/server.ts contains collection call builders (`accounts`, `payments`, `operations`, `effects`, `transactions`, `ledgers`, `offers`, `trades`, `claimableBalances`, `liquidityPools`, etc.) plus selected immediate methods (`loadAccount`, `submitTransaction`, `feeStats`, `fetchBaseFee`, `root`). HoriSift only activates a limited subset, and matching a name does not imply a safe RPC replacement.
- The official migration guide https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc distinguishes REST/HAL semantics, missing direct mappings, recent RPC retention and provider-dependent classic events. Detector evidence has no automatic migration mapping in this milestone.
- Direct HTTP recognition presently whitelists only the three SDF Horizon hosts above and normalizes path segments without serializing raw account IDs, URL parameters or secrets. Custom provider detection is future work requiring reliable evidence, not hostname guessing.

## Activated catalog primary evidence (2026-10-09)

Official guide: https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc (last updated 2026-08-18) distinguishes `/accounts` and `/operations/{id}` without direct equivalents, `/accounts/{address}` via `getLedgerEntries` without joined trustlines, `POST /transactions` via `sendTransaction`, and several event+XDR cases. CAP-67 classic asset events (Protocol 23) require `EMIT_CLASSIC_EVENTS=true`; earlier ledger backfill may require `BACKFILL_STELLAR_ASSET_EVENTS=true`. RPC is not a drop-in historical indexer; see https://developers.stellar.org/docs/data/apis/rpc. All rule records include URL, checked date, limitations and qualified advice. Rule and fixture list: `docs/RULE_CATALOG.md`. This material should be rechecked for SDK/API upgrades before an external release.

## Risk semantics review — 2026-10-10

The [official Horizon-to-RPC guide](https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc) and [RPC overview](https://developers.stellar.org/docs/data/apis/rpc) were rechecked on 2026-10-10. These support high-priority *investigation* of functions without an RPC counterpart or requiring historical indexing, but do not supply calibrated application risk probabilities or universal data-shape equivalence. Phase 06 therefore implements explicit static triage heuristics rather than pretending to quantify production failure risk. See `docs/RISK_ANALYSIS.md`; no real-world accuracy study has been completed.
# Historical constructor import evidence (2026-10-10)

The official SDK v10.4.1 entry point exports `Server` as a named export and exposes its
CommonJS module as the default export: https://github.com/stellar/js-stellar-sdk/blob/v10.4.1/src/index.ts.
Checked directly against the official source on 2026-10-10. HoriSift recognizes proven named,
namespace and CommonJS/destructured constructor bindings as `LEGACY_SDK_SERVER` uncertainty.
This adds no migration-rule mapping and does not assert equivalence with modern Horizon methods.
Type-only, shadowed, unrelated, rest and fallback destructured bindings confer no constructor identity.
