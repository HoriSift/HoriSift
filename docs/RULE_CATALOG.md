# Migration rule catalog and source register

**Status:** Rule inventory and validation policy only. No detection rules are active or implemented.

## Official sources checked 2026-10-09

| Reference | Meaning for proposed rules | Caveat |
|---|---|---|
| https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc | Official mapping and migration behavior | Method hints do not prove equivalent record shape/coverage |
| https://developers.stellar.org/docs/data/apis/rpc | RPC is not a historical indexer and is not a drop-in Horizon replacement | Default history is bounded; verify provider settings |
| https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getEvents | Events retrieved by ledger range | Classic events depend on configured emit/backfill and protocol |
| https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getTransactions | Transaction retrieval and pagination | Results constrained to provider's retained history |
| https://developers.stellar.org/docs/data/apis/horizon/api-reference/structure | HAL response and Horizon streaming | Distinct from JSON-RPC response schema |
| https://github.com/stellar/js-stellar-sdk | Supported JS client interface and migration docs | API shape varies with SDK major version; validate actual import paths |

## Proposed rule candidates — NOT implemented

| Candidate | Horizon evidence | Likely category | Mandatory review before activation |
|---|---|---|---|
| `horizon.account-detail` | `GET /accounts/{address}` or verified SDK equivalent | conditional | `getLedgerEntries` lacks joined trustlines; response shape changes |
| `horizon.account-list` | `GET /accounts` | indexer-required | No direct RPC equivalent |
| `horizon.payments-history` | `GET /payments` and compatible SDK usage | conditional | `getEvents` and XDR are not interchangeable with all Horizon data; history retention |
| `horizon.operation-history` | `GET /operations` | indexer-required | May require ledger/transaction ingestion and XDR parsing |
| `horizon.transaction-post` | `POST /transactions` | conditional | Verify request/response, signing semantics and status lifecycle |
| `horizon.hal-pagination` | Proven `_links.next.href`, `_embedded.records` dependency | conditional | Need response dataflow proof; string literals alone are not evidence |
| `horizon.streaming` | Verified Horizon `.stream()` usage | conditional | RPC querying/polling/ingestion not an SSE drop-in |

These are candidate classifications informed by source review, not active rules, promises of exact mappings, or release scope guarantees. A new active rule requires (a) source URL/date and limitations, (b) precise positive/negative AST patterns, (c) malformed fixture, (d) line/column assertion, (e) deterministic report assertion, (f) documented confidence and mapping kind.
