# Limitations and uncertainty policy

HoriSift has internal source-discovery and syntax-only parsing/reading libraries, but no functional Horizon detector, published npm package, published site, CLI or application migration validation yet. Proposed rules and CLI flags are designs, not implementations.

Once implemented, static source analysis cannot reliably resolve runtime-generated URLs, arbitrary wrappers, plugin loaders, cross-repository code, inferred provider behavior, or every historical Stellar SDK variant. A zero-finding report is **not** proof of migration readiness. An incomplete scan must be declared as such.

Stellar RPC retains bounded history (provider-dependent). Horizon's historical indexing, HAL schema, and streaming behavior are not automatically available via RPC. Even documented RPC method mappings may require ledger-entry reconstruction, transaction XDR processing, separate indexing, provider options, and human review. The project is unaudited. Reports must not include secrets or raw source by default.

File discovery deliberately skips symbolic links, ignores common build/vendor directories and optional literal excluded paths (not `.gitignore` glob syntax), and marks unreadable or truncated coverage incomplete. File enumeration is not an atomic filesystem snapshot; a concurrently modified tree could invalidate containment checks between operations. A future source reader must recheck opened files before parsing. TypeScript type-checking uses a globally installed compiler locally and is not yet pinned or enforced in CI.

The current AST parser records only syntactic module-import and const-alias facts. It does not prove bindings are the same under shadowing, mutated assignments, re-exports, wrappers or conditional imports. Syntax errors and dynamically constructed module specifiers are incomplete/unknown, not automatically supported. Location columns use TypeScript UTF-16 character offsets (1-based) and are not display-width indices. Source reader bounds byte size and enforces UTF-8, but concurrent filesystem changes cannot be excluded completely without stronger OS-level containment primitives.
