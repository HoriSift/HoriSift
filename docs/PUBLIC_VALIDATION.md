# Public-source CLI validation and reproducible developer examples

**Review date:** 2026-10-10. **Source of observations:** public GitHub repositories at the immutable commits linked below; results produced by the actual HoriSift source-checkout CLI, running offline on isolated copies of **individual files**. This is neither an ecosystem-wide accuracy benchmark nor evidence of full-project scanning or production migration success.

## Goal and method

We selected source files authored by **three third-party public codebases**, checked their exact Git blob IDs and licensing, stored byte-identical snapshots with SHA-256 in [`tests/fixtures/public-upstream/`](../tests/fixtures/public-upstream/), and scanned each original JS/TS file at its original relative path. This verifies what HoriSift really recognizes rather than what its developers expected it to recognize. Each output is versioned JSON and compared byte-for-byte to the committed golden report; CI also runs a separate process-level CLI test and a failure-on-tampering test. No upstream application code is executed, installed or imported.

The snapshots include one modern SDK/CommonJS application file, one modern mixed RPC/Horizon TypeScript configuration file, one historical SDK-style Horizon file and one negative control from the latter repository. Upstream license texts are retained with the samples; no copied code is relicensed as HoriSift code.

## How to run these exact examples

With Node.js 22.12+ or Node.js 24 from the repository checkout:

```sh
npm ci --ignore-scripts
npm run example -- axelar-faucet --format json --allow-incomplete
npm run example -- soroswap-config --format json --allow-incomplete
npm run example -- stellar-wind-legacy --format json
npm run example -- stellar-wind-control --format json
npm run test:public
```

To see the ordinary exit-4 incomplete-scan signal, remove `--allow-incomplete` from either modern case. `--format text` is also supported. These examples are bounded, entirely **offline after installing HoriSift's own dependencies**, and use only recorded fixture source bytes. `npm run example` is a *harness for checked public examples*, not a new scanner command and not a published npm installation.

## Authentic observations

| Public source and fixed commit | Expected detector status | Findings / unknowns | CLI exit (without override) | Interpretation |
|---|---|---|---|---|
| [Axelar, `stellar/generate-keypair.js`](https://github.com/axelarnetwork/axelar-contract-deployments/blob/240b43ea89286b32a3a031933f64a96fe733bce2/stellar/generate-keypair.js) | `incomplete` | **2 / 1** | **4** | Detects `Horizon.Server` and `.friendbot()`; its URL comes from runtime configuration and remains unresolved. Both findings are conservatively unmapped. |
| [Soroswap, `utils/env_config.ts`](https://github.com/soroswap/core/blob/6eade008ee6794075ad941609e0fef0d1124d3eb/utils/env_config.ts) | `incomplete` | **1 / 1** | **4** | Detects a Horizon constructor alongside a separate `rpc.Server`, but cannot statically resolve the Horizon URL; does not mistake the RPC client for a Horizon dependency. |
| [Stellar Wind, `app/stellar/index.js`](https://github.com/remarcable/stellar-wind/blob/55b51ae1e099f619b6a2da4c341aa96cf1e79cf0/app/stellar/index.js) | `incomplete` | **0 / 1** | **4** | **Previously verified false negative now conservatively flagged:** source has `import StellarSdk from "stellar-sdk"` and `new StellarSdk.Server("https://horizon.stellar.org")`, but HoriSift previously reported `no-supported-evidence`. The current detector emits `LEGACY_SDK_SERVER` as an unknown/manual-review item. It does not assert historical SDK equivalence. |
| [Stellar Wind, `app/helpers/queue.js`](https://github.com/remarcable/stellar-wind/blob/55b51ae1e099f619b6a2da4c341aa96cf1e79cf0/app/helpers/queue.js) | `complete` | **0 / 0** | **0** | Genuine source control with no Horizon code, but its result looks identical to the missed historical case. The difference from the legacy SDK sample is now explicit in the incomplete/unknown output. |

Actual JSON reports (byte-locked by tests): [`axelar-faucet.json`](../tests/fixtures/public-upstream/axelar-faucet.json), [`soroswap-config.json`](../tests/fixtures/public-upstream/soroswap-config.json), [`stellar-wind-legacy.json`](../tests/fixtures/public-upstream/stellar-wind-legacy.json), and [`stellar-wind-control.json`](../tests/fixtures/public-upstream/stellar-wind-control.json). Full upstream source pinning and license notices: [`manifest.json`](../tests/fixtures/public-upstream/manifest.json), [`README`](../tests/fixtures/public-upstream/README.md).

### Example of the reporting contract

The observed Axelar JSON includes:

```json
{
  "status": "incomplete",
  "triage": "incomplete",
  "summary": { "findings": 2, "unknowns": 1, "diagnostics": 0 }
}
```

This excerpt is intentionally a **projection of the complete report**, not the full JSON format; use the linked golden for the actual schema, sorting and recommendations. The runtime URL is classified as `DYNAMIC_HORIZON_URL`. HoriSift never prints source code, secret values, or raw URL query parameters in these reports.

## Measured strengths, unknowns and follow-up

**Verified from real upstream source snapshots:** source-level detection of two modern Horizon construction patterns; a separate non-Horizon source control produces no finding; static uncertainty is preserved in the modern cases; output is deterministic across process executions and OS tests; all copied upstream bytes are checked against immutable Git blobs and local SHA-256.

**Verified regression and conservative mitigation:** the historically used `StellarSdk.Server` constructor was previously missed. At 3955813e40e8ab828f32607829b28d91af87f758 it yields `status=incomplete`, one `LEGACY_SDK_SERVER` unknown and process exit 4. The scanner has no general mechanism proving that all SDK aliases, wrapper functions, custom provider URLs or historical imports are covered. Do not promise a negative result means Horizon-free code. Full historical method semantics and broader SDK variants remain follow-up work in issue #1; the pinned public golden and expectations were explicitly updated on 3955813e40e8ab828f32607829b28d91af87f758.

**Not verified:** full third-party repository scan coverage, population-level precision or recall, SDK semantic equivalence for historical versions, actual RPC migration correctness, app running/transactions, mainnet compatibility, independent user demand, or package consumption. Four selected files form a **small convenience sample** chosen for clear contrasts; the result must not be generalized statistically. HoriSift's original six synthetic test scenarios remain separate from these four externally sourced files.

Stellar's [Horizon-to-RPC migration guide](https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc) distinguishes direct method correspondence from manual history/indexing work. These samples demonstrate *source dependencies*, not a validated migration path. The guide and [RPC overview](https://developers.stellar.org/docs/data/apis/rpc) were reviewed 2026-10-10 for this documentation; no new RPC rule was activated.

## Repeatability and provenance

All upstream URLs include specific Git commits; an upstream default-branch update cannot silently change the checked-in sample. Snapshot IDs are **Git blob SHA-1** over the complete original bytes, corroborated with **SHA-256**, not SHA-1 hashes of merely displayed strings. The tests verify both, then scan staged original paths; they do not use `git clone` or internet access during CI scanning.

```sh
npm run test:public
npm run cli -- --help
# To inspect any chosen real application repository yourself, use:
# npm run cli -- scan <local-application-directory> --format json
```

A whole-directory scan of the upstream projects may behave differently, including additional diagnostics or detections; we have not asserted its result. Outputs may evolve as detectors improve. No adoption, upstream maintainer approval, npm publishing, grant decision, or RPC correctness is asserted.

**Known historical detector issue:** https://github.com/HoriSift/HoriSift/issues/1. **Verified Phase 11 source commit:** `89bbde8c52374bf25aa2e7c2300e7b4a589d239d`. **Six-job CI evidence:** https://github.com/HoriSift/HoriSift/actions/runs/38009046725.

## Updated real-source regression evidence

On 3955813e40e8ab828f32607829b28d91af87f758 with six successful Ubuntu/Windows/macOS × Node 22/24 CI jobs (https://github.com/HoriSift/HoriSift/actions/runs/38014903027), the historical Stellar Wind sample is no longer silently clean: JSON is `incomplete`, unknown code `LEGACY_SDK_SERVER`, zero classified findings, exit 4. Eleven new positive/negative/shadowing tests were added (503 standard tests total); other pinned-source reports remain byte-stable. This is a conservative warning, **not** complete historical SDK support. The older complete/zero baseline remains documented as historical evidence of the bug. Public developer docs: https://oobayemi.gitbook.io/horisift-documentation/.

## Later whole-checkout observations

The earlier four-file samples remain valid historical regression evidence. On merged source `09bb684a641e31c1abb61741587334305f9d8e09`, complete checkouts of the same three fixed upstream commits were scanned with default bounded JS/TS discovery: 13 Stellar Wind files, 31 Soroswap core files and 159 Axelar files. All scans incomplete; no target code or dependency install occurred. Exact reports, repeated hashes, licenses, source review and known missed call sites: [production review](PRODUCTION_REVIEW.md), [manifest](validation/manifest.json). This improves breadth but is not independently adjudicated population accuracy; prior statements of no whole-checkout scans apply to their original review, not this follow-up.
