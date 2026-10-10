# Reports and migration guidance

Reports have a versioned deterministic JSON contract (currently `schemaVersion: 1.0.0`), with relative source paths, rule IDs, findings, unknowns, diagnostics, summary, status and triage. A finding is evidence of supported syntax, **not proof of a safe RPC replacement**.

The engine distinguishes mappings that may be direct, conditional, require indexing, lack a direct equivalent, or remain unknown. Horizon serves REST/HAL resources, while Stellar RPC uses JSON-RPC, a different retention model, and often requires application-side indexing. Always validate specific replacement behavior against [official Stellar guidance](https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc).

Rules and schemas are maintained in [docs/RULE\_CATALOG.md](https://github.com/HoriSift/HoriSift/blob/main/docs/RULE_CATALOG.md), [docs/REPORTING.md](https://github.com/HoriSift/HoriSift/blob/main/docs/REPORTING.md), and [schemas/](https://github.com/HoriSift/HoriSift/tree/main/schemas). Outputs omit raw source and secret values by default. Path, byte and file-count bounds are intentional safety controls.
