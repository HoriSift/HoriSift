# Development CLI usage

**Status:** Source-checkout CLI implemented and tested, not a published npm package. Verified 2026-10-10 on commit `d9fcb88d37168492bf065cf749d795fe47da7204` via [six successful CI jobs](https://github.com/HoriSift/HoriSift/actions/runs/38004114440).

## Run locally

With Node.js 22.12+ or Node.js 24, in this repository:

```sh
npm ci
npm run cli -- --help
npm run cli -- --version
npm run cli -- rules
npm run cli -- rules --format json
npm run cli -- scan <repository-path> --format text
npm run cli -- scan <repository-path> --format json
```

This is a read-only local scan; it does not execute target source, install target dependencies, contact Stellar services, or upload files. The package is private and unpublished. Node 22 may issue an experimental strip-types warning to stderr.

## Supported options

- `scan <path>`: exactly one path argument, an existing readable directory; use `--` for leading-dash paths
- `--format text|json`: defaults to text; JSON retains all findings regardless of presentation filters
- `--severity info|low|medium|high`: defaults to info; filters **text display only**
- `--fail-on info|low|medium|high`: opt-in CI threshold over **all** findings, including those hidden in text
- `--allow-incomplete`: changes exit handling, **not** the reported incomplete status
- `rules [--format text|json]`: shows the reviewed rule catalog, not validated drop-in replacements
- `--help`, `--version`: show command guidance and development version 0.0.0

Unknown, repeated, missing or malformed arguments are rejected; options are case sensitive. `--format=json` is intentionally unsupported; use `--format json`.

## Exit codes

| Exit | Meaning |
|---|---|
| 0 | Valid operation without an applicable fail-on threshold, or incomplete scan explicitly allowed |
| 1 | One or more findings meet/exceed explicit fail-on threshold (when complete or incomplete allowed) |
| 2 | Invalid arguments, path, root configuration or usage |
| 3 | Unexpected fatal runtime or filesystem failure |
| 4 | Incomplete scan (empty/unsupported source, dynamic uncertainty, unreadable files, resource coverage gap) unless explicitly allowed |

Precedence: invalid usage (2) and fatal runtime (3), then unallowed incomplete (4), threshold finding (1), success (0). A complete scan with zero findings means **no recognized evidence within supported patterns**, not migration readiness.

## Output maturity and limitations

Text output shows summary, normalized relative source locations, rule IDs, unknowns and diagnostics. JSON adapts the existing deterministic internal risk model with `toolVersion`, `schemaVersion`, `ruleSetVersion`, `status`, `triage`, `summary`, `findings`, `unknowns`, `diagnostics`, `root='.'` and `filesInspected`. It excludes raw source, request bodies, secrets, local absolute paths and timestamps by default. The dedicated versioned report renderer is now implemented with declared v1 scan/rules JSON Schemas (`schemas/`) and LF golden snapshots. The development checkout CLI has not been published, and public backward-compatibility commitments require a release review. See `docs/REPORTING.md`.

Custom Horizon hosts, arbitrary wrappers, intermodule flows and real-world accuracy evaluation remain unsupported or unmeasured. Even a direct official RPC mapping is not proof of identical behavior.
