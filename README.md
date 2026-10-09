# HoriSift

**Find Horizon dependencies before migrating your Stellar application.**

HoriSift is a planned local-first command-line analyzer for JavaScript and TypeScript Stellar applications. Its goal is to identify supported Horizon SDK and HTTP usage, distinguish straightforward API changes from indexing or data-model work, and produce evidence-backed migration findings.

**Current availability:** This repository has internal local-first discovery, JS/TS parsing, Horizon usage detection, versioned migration guidance and static risk triage. A public `horisift` CLI, final report renderer, installation command and actual migration verification are **not yet implemented**. Do not treat the proposed examples in the product specification as working commands.

## Why this matters

Horizon returns REST/HAL resources and indexed history; Stellar RPC uses JSON-RPC and retains a bounded recent history. The APIs cannot be exchanged merely by changing the server URL. Consult the [official migration guidance](https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc) before modifying an application.

## Scope and limitations

The intended initial analyzer targets JavaScript and TypeScript source files, with conservative findings and explicit uncertainty. It will not execute the inspected repository, transmit source code, rewrite applications, assert that every Horizon API has a direct RPC replacement, or certify migration readiness. Source-file discovery (`src/scanner/discover.ts`), syntax-only parsing (`src/parser/parse.ts`), safe source reading (`src/parser/read.ts`) and conservative Horizon usage detection (`src/analysis/horizon.ts`) are available internally. These are internal libraries, now joined by versioned advisory migration rules (`src/rules/catalog.ts`) and a static risk-triage engine (`src/analysis/risk.ts`). Its severities prioritize manual investigation, not guaranteed application compatibility; the public CLI remains unimplemented.

## Documentation

- [Product scope](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Rule catalog and evidence policy](docs/RULE_CATALOG.md)
- [Risk-triage contract and limits](docs/RISK_ANALYSIS.md)
- [Testing approach](docs/TESTING.md)
- [Known limitations](docs/LIMITATIONS.md)
- [Contributing](CONTRIBUTING.md) and [security](SECURITY.md)

## Development checks

With Node.js 22.12+ or Node.js 24.x:

```bash
npm ci
npm test
npm run typecheck
npm run check:foundation
```

These commands verify foundation checks, discovery, parsing, narrowly scoped Horizon detection, the advisory rules and static risk triage. They do not establish application migration readiness, production compatibility or a published CLI. They do not install or run the proposed CLI.

## License

MIT. See [LICENSE](LICENSE).

HoriSift is an independent open-source project and is not endorsed by the Stellar Development Foundation.
