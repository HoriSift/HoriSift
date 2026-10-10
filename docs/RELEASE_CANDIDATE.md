# Reproducible private npm release candidate

**Status:** Source-only, **not published**. Candidate package version `0.1.0-rc.1` with `private: true`. No GitHub tag, npm publish, release or deployment is authorized or performed by this engineering gate.

## What changes from the development CLI

The source checkout still uses `npm run cli -- scan <path> --format json` and type stripping. The tarball instead advertises `bin.horisift = dist/cli/entry.js`, emitted from TypeScript and retaining its Node shebang. The only packaged runtime dependency is locked `typescript@6.0.3` because parsing needs it at runtime. The package excludes development-only `@types/node` and does not contain original TypeScript source, tests, fixtures, static site, workflows or internal roadmap material. npm automatically includes README/LICENSE and `package.json`; `files` is an explicit allowlist.

## Offline archive preparation, checksum and online isolated installation

Run in a clean repository checkout with Node 22.12+ or Node 24:

```sh
npm ci --ignore-scripts
npm run check:foundation
npm run typecheck
npm run build
npm run smoke:build
npm run release:pack
npm run release:verify
```

`release:pack` performs two `npm pack --ignore-scripts --json` operations in separate temporary directories without publishing, verifies the exact 12 entries and identical SHA-256 bytes, checks the shebang, and writes `release-artifacts/horisift-0.1.0-rc.1.tgz` and its `.sha256` sidecar. The directory is ignored by Git.

`release:verify` repeats the byte-identical packing checks **and** installs the generated `.tgz` as a dependency in a new temporary npm consumer using `npm install --ignore-scripts --no-audit --no-fund`. It validates npm-generated `horisift` executable shims using `npm run`, CLI version, 25 rules, installed `--help`, one actual scanned source, JSON findings, high-severity threshold exit 1, and the absence of leaked absolute paths or internal project files. The isolated npm installation **requires access to the npm registry** to download the pinned TypeScript runtime dependency. Any failure aborts CI, and temporary install directories are removed.

The tests also reject altered manifest, missing compiled bin, missing entry shebang, source-map or source leakage, extra package payload entries, unsafe file names, lifecycle scripts, unpinned dependencies, stale lockfile, altered SHA-256 and oversized content. The full matrix runs the gate on Ubuntu, macOS and Windows with Node 22 and 24. Checksums may vary with npm/TypeScript builds across tool versions; each job establishes byte reproducibility for its own environment, not cross-platform archive identity.

## Integrity, licensing and developer safety

The tarball includes the HoriSift MIT license and repository README, not copied upstream third-party fixture sources. The `files` allowlist and `private: true` policy are checks, not a guarantee against all supply-chain compromise; the npm advisory check is limited by current advisories. The scanner executes no code from its target and does not require or upload target project dependencies.

**Known blocker:** historical default import `StellarSdk.Server(...)` is missed in [GitHub issue #1](https://github.com/HoriSift/HoriSift/issues/1). This candidate demonstrates packaging/invocation mechanics only, not detection completeness, migration correctness, external independent security auditing or ready-to-publish acceptance. Before authorizing any release, resolve the issue, benchmark real repositories, review disclosure/support ownership and recheck official program rules.

## Verified build and CI evidence — 2026-10-10

- Exact code SHA, all six job status results and action run URLs.
- Candidate version, tar entries count, and verified SHA-256 from the CI runners (not assumed identical across operating systems).
- Local test outcomes and any environment-specific failures.
- Explicit distinction between successful private package testing and an approved public release.

### Verified candidate outcome

- Code commit: `e150397fbcda54609581265df7e75a3760b6522e`; verified all six GitHub jobs at https://github.com/HoriSift/HoriSift/actions/runs/38011820467 (Ubuntu/Windows/macOS × Node 22/24, each successful).
- Candidate manifest: `private: true`, `0.1.0-rc.1`, exactly 12 entries: nine compiled JS modules, README, license and package metadata; no source maps or raw TypeScript/test/site assets.
- Each CI job executed reproducible two-pack archive/checksum comparison, `npm install` of local tarball into an isolated fresh consumer, npm-generated bin shim version `0.1.0-rc.1`, rule-list count 25 and real installed scan returning exit 1 with a high finding. Standard test suite 492/492; 17 new release tests; 24 negative quality checks; site 33, pinned public-source 15 and Ubuntu24 stress 8/8.
- Local Node22.16/TS5.8.3 produced two byte-identical tarballs, 27,494 bytes with SHA-256 `c49c1e2a15fd9535cffd1eb16eecb24e942a85a481e8a0ba73cc95b54c7aa8fa`. Ubuntu24 pinned TypeScript6 CI independently reported the same hash/size. This is the hash of that candidate build, not a guarantee for altered code/tooling.
- **Local clean npm registry-backed install not run** (registry inaccessible in model container); six successful online CI consumer installs are the verification evidence.
- No npm registry package, git tag, GitHub release, deployment or Wave application has been published/submitted.
