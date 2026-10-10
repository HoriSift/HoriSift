# Reproducible public examples

HoriSift includes **four byte-pinned third-party source files from three public repositories**. These are single-file tests, not complete external app scans or a precision/recall benchmark. No scanned code is executed.

| Public source file                 | Verified output (2026-10-10)                         | Interpretation                                                      |
| ---------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Axelar Stellar generate-keypair.js | 2 findings, 1 unknown, incomplete                    | A modern Horizon constructor is detected; runtime URL is unresolved |
| Soroswap env\_config.ts            | 1 finding, 1 unknown, incomplete                     | Horizon and RPC clients coexist; URL unresolved                     |
| Stellar Wind app/stellar/index.js  | 0 classified findings, 1 unknown, incomplete, exit 4 | **Legacy `StellarSdk.Server` is now flagged for manual review**     |
| Stellar Wind queue.js              | 0 findings, 0 unknowns, complete                     | Non-Horizon source control                                          |

The historical SDK case previously produced an incorrect `complete/zero` output. On [commit 3955813e](https://github.com/HoriSift/HoriSift/commit/3955813e40e8ab828f32607829b28d91af87f758), it instead creates `LEGACY_SDK_SERVER` unknown and exits 4. Six OS × Node CI jobs passed [this exact change](https://github.com/HoriSift/HoriSift/actions/runs/38014903027). This is **not** full historical SDK API semantics; [issue #1](https://github.com/HoriSift/HoriSift/issues/1) remains open.

Reproduce from source checkout with Node 22.12+ or 24.x:

```bash
npm ci --ignore-scripts
npm run example -- axelar-faucet --format json --allow-incomplete
npm run example -- soroswap-config --format json --allow-incomplete
npm run example -- stellar-wind-legacy --format json
npm run test:public
```

Original Git commits, licenses, source blob hashes and exact current JSON goldens: [public source evidence](https://github.com/HoriSift/HoriSift/blob/main/docs/PUBLIC_VALIDATION.md). A representative whole-repository benchmark is [issue #2](https://github.com/HoriSift/HoriSift/issues/2).

Neither these examples nor the existence of 15 scoped GitHub issues establishes Drips organizer admission.
