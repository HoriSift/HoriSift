# HoriSift

**Find Horizon dependencies before migrating your Stellar application.**

HoriSift is a planned local-first command-line analyzer for JavaScript and TypeScript Stellar applications. Its goal is to identify supported Horizon SDK and HTTP usage, distinguish straightforward API changes from indexing or data-model work, and produce evidence-backed migration findings.

**Current availability:** This repository contains the engineering foundation and product specification. The `horisift` scanner and installation command are **not yet implemented**. Do not treat the proposed examples in the product specification as working commands.

## Why this matters

Horizon returns REST/HAL resources and indexed history; Stellar RPC uses JSON-RPC and retains a bounded recent history. The APIs cannot be exchanged merely by changing the server URL. Consult the [official migration guidance](https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc) before modifying an application.

## Scope and limitations

The intended initial analyzer targets JavaScript and TypeScript source files, with conservative findings and explicit uncertainty. It will not execute the inspected repository, transmit source code, rewrite applications, assert that every Horizon API has a direct RPC replacement, or certify migration readiness. Source-file discovery is now available as an internal library module under `src/scanner/discover.ts`. The Horizon analyzer and CLI are not yet implemented.

## Documentation

- [Product scope](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Rule catalog and evidence policy](docs/RULE_CATALOG.md)
- [Testing approach](docs/TESTING.md)
- [Known limitations](docs/LIMITATIONS.md)
- [Contributing](CONTRIBUTING.md) and [security](SECURITY.md)

## Development checks

With Node.js 22.12+ or Node.js 24.x:

```bash
npm ci
npm test
npm run check:foundation
```

These commands check the **foundation files**, not functional migration detection. They do not install or run the proposed CLI.

## License

MIT. See [LICENSE](LICENSE).

HoriSift is an independent open-source project and is not endorsed by the Stellar Development Foundation.
