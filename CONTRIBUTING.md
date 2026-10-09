# Contributing

HoriSift is in its engineering foundation stage. Before proposing code, read [AGENTS.md](AGENTS.md), [architecture](docs/ARCHITECTURE.md), and the [current handoff](docs/PROJECT_HANDOFF.md). Open a focused issue for changes that alter scanner semantics, public reports, or migration classifications.

For every detection rule, contribute positive, negative, malformed-input, location, classification, and regression tests. Cite official Stellar documentation for any migration advice and mark uncertain mappings unknown instead of guessing. Never execute inspected code or commit credentials, proprietary source, or unredacted fixtures.

Use conventional commits, small changes, and reviewable pull requests. Do not alter public release state without maintainer approval. Existing foundation checks: `npm ci && npm test && npm run check:foundation`. Scanner tests and build commands will be added as implementation becomes real.
