# Pinned public upstream source validation

These are **verbatim, pinned copies of individual public repository source files**, not synthetic code. Each `.source` file is deliberately not a JS/TS extension in the HoriSift checkout; the example runner restores its original upstream filename under an isolated temporary directory before scanning. The scanner does not load or execute copied application code, install its dependencies, connect to Stellar networks, or request user credentials.

The source snapshot identity is locked by both the original Git blob SHA-1 and a SHA-256 in [`manifest.json`](manifest.json). Every CI job checks byte identity before scanning. The full JSON reports from actual executions are stored alongside the source as `*.json` snapshots. An upstream repository can change after the pinned commit without affecting reproducibility; source behavior beyond the specific pinned file is **not** evaluated.

## Upstream attribution and redistribution

| Corpus ID | Upstream file (immutable commit) | License | Purpose |
|---|---|---|---|
| `axelar-faucet` | [Axelar contract deployments: stellar/generate-keypair.js](https://github.com/axelarnetwork/axelar-contract-deployments/blob/240b43ea89286b32a3a031933f64a96fe733bce2/stellar/generate-keypair.js) | MIT | Modern CommonJS Horizon constructor and Friendbot call with runtime URL |
| `soroswap-config` | [Soroswap core: utils/env_config.ts](https://github.com/soroswap/core/blob/6eade008ee6794075ad941609e0fef0d1124d3eb/utils/env_config.ts) | Apache-2.0 | Horizon plus RPC client construction, runtime Horizon URL |
| `stellar-wind-legacy` | [Stellar Wind: app/stellar/index.js](https://github.com/remarcable/stellar-wind/blob/55b51ae1e099f619b6a2da4c341aa96cf1e79cf0/app/stellar/index.js) | MIT | Historically used `StellarSdk.Server` pattern; **currently missed**, not a clean example |
| `stellar-wind-control` | [Stellar Wind: app/helpers/queue.js](https://github.com/remarcable/stellar-wind/blob/55b51ae1e099f619b6a2da4c341aa96cf1e79cf0/app/helpers/queue.js) | MIT | Genuine non-Horizon source control from the same public repository |

Copied source and upstream licensing remain with the original authors. License texts retained locally:

- [`AXELAR-MIT-LICENSE.txt`](AXELAR-MIT-LICENSE.txt) — Axelar Foundation (2023)
- [`STELLAR-WIND-MIT-LICENSE.txt`](STELLAR-WIND-MIT-LICENSE.txt) — Marc Nitzsche and Christian Haug (2018)
- [`APACHE-2.0-LICENSE.txt`](APACHE-2.0-LICENSE.txt) — Apache License 2.0 governing Soroswap code; see [original](https://github.com/soroswap/core/blob/6eade008ee6794075ad941609e0fef0d1124d3eb/LICENSE)

Source files are unmodified except their `.source` filename suffix; newline identity is pinned by `.gitattributes`. These original licenses govern the included upstream source files, **not** HoriSift's own MIT-licensed implementation. This is third-party source attribution, not a claim that upstream maintainers approve, use, or endorse HoriSift.

## Reproduce offline from the HoriSift checkout

```sh
npm ci --ignore-scripts
npm run example -- axelar-faucet --format json --allow-incomplete
npm run example -- soroswap-config --format json --allow-incomplete
npm run example -- stellar-wind-legacy --format json
npm run example -- stellar-wind-control --format json
npm run test:public
```

The `--allow-incomplete` flag changes exit-code handling **only**; the JSON `status` still says `incomplete`. Without that flag the two modern real examples exit **4**. The historical false-negative and the genuine non-Horizon control currently exit **0**; they must **not** be interpreted as equivalent outcomes. Tests intentionally preserve this distinction and may need updating when the historical detector gap is properly fixed.

See [`docs/PUBLIC_VALIDATION.md`](../../../docs/PUBLIC_VALIDATION.md) for actual observed results, caveats, reproduction steps, and evidence date.
