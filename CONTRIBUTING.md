# Contributing

HoriSift has a working source-checkout CLI and an unpublished compiled package candidate. Before proposing code, read [AGENTS.md](AGENTS.md), [architecture](docs/ARCHITECTURE.md), and the [current handoff](docs/PROJECT_HANDOFF.md). Open a focused issue for changes that alter scanner semantics, public reports, or migration classifications.

For every detection rule, contribute positive, negative, malformed-input, location, classification, and regression tests. Cite official Stellar documentation for any migration advice and mark uncertain mappings unknown instead of guessing. Never execute inspected code or commit credentials, proprietary source, or unredacted fixtures.

Use conventional commits, small changes, and reviewable pull requests. Do not alter public release state without maintainer approval. Run `npm ci --ignore-scripts`, `npm run build`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run security:check` and `npm run release:verify`. The independent JSON Schema implementation is a development-only dependency; it never compiles schemas supplied by scanned applications. See [full-checkout validation](docs/PRODUCTION_REVIEW.md) for reproducible observations and remaining release gaps.
