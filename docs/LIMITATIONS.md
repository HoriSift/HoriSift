# Limitations and uncertainty policy

HoriSift is in foundation stage; there is no functional source-code scanner, published npm package, published site, or application migration validation yet. Proposed rules and CLI flags are designs, not implementations.

Once implemented, static source analysis cannot reliably resolve runtime-generated URLs, arbitrary wrappers, plugin loaders, cross-repository code, inferred provider behavior, or every historical Stellar SDK variant. A zero-finding report is **not** proof of migration readiness. An incomplete scan must be declared as such.

Stellar RPC retains bounded history (provider-dependent). Horizon's historical indexing, HAL schema, and streaming behavior are not automatically available via RPC. Even documented RPC method mappings may require ledger-entry reconstruction, transaction XDR processing, separate indexing, provider options, and human review. The project is unaudited. Reports must not include secrets or raw source by default.
