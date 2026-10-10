# Production preparation review — 2026-10-10

**Decision: validated installable candidate; stable public release remains HOLD.**
PR #29 is merged at `09bb684a641e31c1abb61741587334305f9d8e09`; its main-branch
[six-platform CI](https://github.com/HoriSift/HoriSift/actions/runs/38019076338) passed.
Fifteen scoped open issues (#1–#15) were checked live. They have no Wave funding labels;
GitHub backlog status does not establish Drips admission.

## Whole-checkout observations

We cloned the three already licensed sample repositories at their original fixed commits,
checked detached HEAD and license hashes, and scanned complete checkouts using the default
bounded JS/TS discovery policy. No target dependencies were installed or target code executed.
The corpus is a small convenience sample; unsupported languages, excluded generated/dependency
directories, runtime behavior and cross-file provenance remain outside this measurement.

| Repository | Inspected JS/TS files | Findings | Unknowns | Diagnostics | Exit |
|---|---:|---:|---:|---:|---:|
| Stellar Wind | 13 | 0 | 1 | 0 | 4 |
| Soroswap core | 31 | 1 | 3 | 0 | 4 |
| Axelar contract deployments | 159 | 8 | 5 | 5 | 4 |

All three reports are **incomplete**. The 203 inspected files are not 203 independently
validated migrations. Exact repository commits, license SHA256 values, report hashes and
tool/runtime identity are in [validation/manifest.json](validation/manifest.json).
Full sanitized reports are committed beside that manifest. Each report was reproduced
byte-for-byte on a second scan. CI validates the archived reports with Ajv; it does not
clone or execute these external applications.

### Source review and known misses

Manual source inspection corroborated all nine classified findings: Soroswap's Horizon
constructor at `utils/env_config.ts:88`, and Axelar's five constructors, friendbot call,
loadAccount call and submitTransaction call. This is an internal review of emitted evidence,
not an independent or exhaustive ground-truth labeling of all 203 files.

- Stellar Wind `app/stellar/index.js:3` produces a legacy-constructor warning. Its transaction
  stream at lines 9–11 is not classified; historical call semantics remain open in issue #1.
- Soroswap `scripts/old_bash/issue_stellar_assets.js` has three constructor sites (14, 19, 24),
  and `stellar_mint_asset_test.js` has four (9, 20, 26, 32). Both receive a file-level mutable
  SDK warning rather than seven constructor findings. Unknowns are not definite detections.
- Axelar `stellar/utils.ts:391` uses a function-parameter Horizon client and is not classified
  at that call site. Cross-function provenance remains unsupported.
- Axelar also has five `DYNAMIC_MODULE` diagnostics, so parser/import coverage is incomplete.

No population precision/recall is reported. A denominator of only emitted findings would
hide missed/unsupported usages. Issue #2 remains open for a diverse corpus, independently
adjudicated ground truth and appropriate accuracy metrics.

### Reproduce without executing applications

Clone these repositories into a collection directory using the manifest IDs as directory
names, then `git checkout --detach <manifest commit>` in each:

- `stellar-wind`: https://github.com/remarcable/stellar-wind.git
- `soroswap-core`: https://github.com/soroswap/core.git
- `axelar-contract-deployments`: https://github.com/axelarnetwork/axelar-contract-deployments.git

From HoriSift, run:

```sh
npm ci --ignore-scripts
node scripts/verify-repository-corpus.mjs /path/to/collection
```

The harness requires ordinary detached clones with matching HEAD/license files and compares
each actual CLI report to its recorded hash. It does not download repositories or run Git
hooks/configuration. HEAD/license agreement is a provenance check, not proof that every
checkout byte is unchanged; use fresh checkouts. A mismatch fails rather than updating goldens.

## Independent schema implementation

Tests now compile the trusted HoriSift Draft 2020-12 schemas with development-only
`ajv@8.20.0` in strict mode. Valid scan/rules goldens and real reports pass; malformed versions,
extra fields, invalid enums/locations, absent evidence and secret-bearing fields are rejected.
This replaces the custom partial validator. Ajv is not added to the CLI runtime dependency
graph, and target repositories cannot supply schemas. Reference checked 2026-10-10:
https://ajv.js.org/json-schema.html#draft-2020-12.

Independent validation exposed an overly broad schema path pattern: it accepted `../app.js`
although the scanner/report runtime rejects traversal segments. The schema now enforces
the existing relative-POSIX-path contract for locations and nullable diagnostic paths,
including controls, empty/dot segments and backslashes. No emitted v1 field or valid golden
changes; this narrows acceptance of already invalid reports. Unicode paths remain valid.

## Remaining public-release conditions

An independent human security review and verified private disclosure/support contact have
not been supplied. Parser CPU isolation and filesystem race safety need further review
(issues #11/#12). Historical and indirect-source coverage is limited. npm publication,
GitHub release creation and a production version are not implied by merging code.

The existing GitBook site is public. The missing root site configuration is now on main,
but its site-level connection still reports pending. An API import request was accepted
without evidence of a completed content revision; it is not a verified sync. Finish the
configuration in the existing GitBook UI with `main`, project directory `./`, and initial
direction GitHub → GitBook; see [GitBook sync](GITBOOK_SYNC.md).

This review improves application evidence and reproducibility. It does not certify that
the CLI is production-safe, publish a package, submit a Drips application, or grant approval.
