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

No rule above has been implemented and no repo scan has been verified.
