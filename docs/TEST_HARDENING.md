# Repository scan hardening and bounded-stress evidence

**Status:** Phase 09 synthetic corpus and stress checks implemented. Verification checked 2026-10-10. This document is an engineering test record, not a claim that all Stellar applications or adversarial filesystems can be scanned without errors.

## Fixture provenance and scope

`tests/fixtures/application-corpus.json` contains six **synthetic, application-like** JS/TS scenarios constructed for tests: wallet account lookups, a payment-submission and streaming service, historical account listing, a malformed mixed repository, an unresolved dynamic host/path, and non-executable comment/string/shadowing examples. These are not cloned open-source application repos, user adoption evidence or observations of live network behavior. They exercise the actual pipeline from discovery through report rendering and check that creating identical files in reverse order produces byte-identical JSON.

Fixture guidance is in [tests/fixtures/README.md](../tests/fixtures/README.md). Correspondence of account reads, transaction submission and indexed history to current API migration categories was checked against [Stellar's official migration guidance](https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc) on 2026-10-10. The fixture sources are intentionally made-up code; supported tests do not guarantee runtime behavior.

## Deterministic regression tests

- `tests/integration/application-corpus.test.mjs`: 13 cases, including source-to-risk positive/negative/unknown/incomplete, UTF-8 names, exact same JSON across two filesystem creation orders and source non-disclosure.
- `tests/regression/adversarial-property.test.mjs`: 42 cases covering unsafe paths, exact byte boundaries, invalid UTF-8, NUL, extensions, malformed syntax, misleading comments/strings, shadowed `fetch`, outside-root symlinks and injected read errors without credential leakage.
- `tests/stress/stress.test.mjs`: eight separately scheduled bounded-stress cases. Standard `npm test` runs the first two files across **all six CI jobs**. `npm run test:stress` runs the additional eight on Ubuntu + Node.js 24, to avoid multiplying a large synthetic load across the matrix.

This milestone introduces 55 normal CI tests and eight dedicated stress tests, for **427 normal tests + 8 stress tests = 435 passed test executions** on the verified implementation matrix (not 435 unique tests in every CI job). Existing goldens and JSON schemas continue to run on every operating system and supported Node version.

## Resource and performance boundaries

| Scenario | Observed safe behavior | Test gate | Evidence methodology |
|---|---|---|---|
| 20,001 synthetic `.ts` directory entries | Include 20,000 files, mark `FILE_LIMIT`, status `incomplete` | 30 s CPU/wall budget | Injected **in-memory filesystem IO**, not 20k physical files |
| 100,005 synthetic directory entries | Stop reading at 100,000 and mark `ENTRY_LIMIT`, status `incomplete` | 30 s | Injected async directory stream, no physical filesystem stress |
| 256 real JS/TS files | 256 inspected; 512 expected SDK findings; deterministic JSON | 30 s | Real temporary directory on Ubuntu runner |
| 1 MiB file and 1 MiB + 1 byte | Admit exact byte cap, reject next byte | Correct safe status | Real temporary local file |
| Depth 32 + next level | Mark `DEPTH_LIMIT`, do not recurse | Bounded skip | Real nested directories |
| Symbolic-link directory loop | Skip link, preserve incomplete coverage, never traverse target | Safe status and diagnostic | Real symlink where permitted |
| 320 generated harmless code variants | No executable source run and no false Horizon finding | Deterministic property assertions | Synthetic in-memory JS/TS strings |
| Exact versus over-budget aggregate bytes | Accept equal cap, stop safely at one-byte-over limit | Correct diagnostic | Real small files |

**Measured CI results** (GitHub Ubuntu 24 / Node.js 24, 2026-10-10): 20,001 synthetic entries **150 ms**, 100,000 enumerated entries **180 ms**, 256 real files and 512 findings **188 ms**. Values are indicative single-job observations, not performance guarantees or statistically sampled benchmarks. The harness measures elapsed processing time, not peak RSS, and currently does not prove behavior with 20k *real physical* source files or filesystems under active mutation. The thresholds are intentionally permissive to avoid platform-specific CI flakiness; optimize only with representative evidence.

## Limitations and follow-up

- Static analysis cannot resolve every runtime-generated Horizon provider, wrapper, alias or intermodule dataflow. A negative fixture proves only the absence of supported findings for that fixture, not zero false negatives across ecosystem applications.
- This suite uses synthetic fixture source; it does not measure real-application precision/recall, user value, mainnet correctness, RPC response parity, malware resistance, memory ceilings, or filesystem races under OS-specific adversaries.
- The filesystem is never a globally atomic snapshot. Symlink and path checks lower risk but cannot guarantee elimination of concurrent swap races.
- Performance counters should be compared only on like-for-like hardware with the same test input. Do not use recorded millisecond values in public marketing as reproducible general-purpose benchmarks.
- Next milestone: CI hardening (dependency, formatting/lint/build/security gates, intentional failure signaling and exact SHA evidence), then independently evaluated real applications and release review.

**Code SHA:** `8d7c9d2edc095b8cd642b05b9fb183d652678e13`.
**CI run:** https://github.com/HoriSift/HoriSift/actions/runs/38006982913.