# HoriSift — Stellar Wave application evidence pack

**Prepared:** 2026-10-10. **Submission:** Not submitted. **Organizer approval:** Not verified. **Public npm release:** None.

## Project identity

- **Repository:** https://github.com/HoriSift/HoriSift
- **Documentation:** https://oobayemi.gitbook.io/horisift-documentation/
- **License:** MIT
- **Category:** independent, local-first Stellar developer tooling, JavaScript/TypeScript CLI
- **Maintainer:** repository owner in GitHub; verify accountable review capacity in the Drips dashboard

## Application description (copy-ready draft)

HoriSift is a local-first developer CLI that helps JavaScript and TypeScript Stellar maintainers investigate dependencies on Horizon before considering changes to Stellar RPC and related data services. It reads source code without executing the inspected application or uploading it. Its conservative detector and versioned migration guidance identify supported SDK and HTTP patterns, link actionable findings to specific source locations, and deliberately report unknowns or incomplete scans rather than claiming that every Horizon endpoint can be replaced directly. It is meant to support investigation, not certify a migration. The MIT-licensed repository provides automated edge-case testing, deterministic JSON/text reports, release-candidate package checks, honest public-source examples, documentation, and a set of contributor-sized enhancement issues.

## Verified evidence at preparation time

- Existing engineering CI on `0439ad1f665830c8ef61e8931d06d1cf2a61d927`: https://github.com/HoriSift/HoriSift/actions/runs/38013413883 (six OS × Node jobs successful, 492 standard tests).
- An additional change safely identifies the historical `stellar-sdk` Server constructor as an **incomplete manual-review item**; do not claim this is deployed until its own GitHub CI run passes.
- Existing four preserved public source files from Axelar, Soroswap and Stellar Wind: https://github.com/HoriSift/HoriSift/blob/main/docs/PUBLIC_VALIDATION.md. These are **single-file** observations, not entire third-party applications or measured precision/recall.
- Private npm tarball candidate `0.1.0-rc.1` has passed isolated consumer installation tests. It is NOT on npm. No official release tag or hosted app is required merely to have public GitHub issues, but distribution claims must remain accurate.
- Documentation is published on GitBook; prior static landing page source is **not deployed** and is not the public documentation URL.

## Developer usefulness and differentiation

The problem is migration discovery: finding source locations that use Horizon and identifying nontrivial historical/indexer requirements. HoriSift does not claim to replace Stellar RPC, indexers, or transaction simulators. It complements official migration documentation by collecting reproducible source-level evidence and surfacing uncertainty. Read the official [Horizon-to-RPC migration guide](https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc); specific methods and event indexing cannot be assumed equivalent.

## Contributor-ready issue queue

15 distinct open GitHub issues are documented in [WAVE_ISSUES.md](WAVE_ISSUES.md) with acceptance criteria, non-goals and targeted test requirements. They are **not yet Wave-funded or organizer-approved**. Wave issue eligibility, point budgets and application slots are determined by Drips and the program organizer, not this repository.

## Reviewer questions and transparent answers

**Has the CLI been published to npm?** No; an unpublished private test tarball is validated.

**Has anyone used HoriSift in production?** No independently evidenced users, downloads or production migrations are claimed.

**Does a clean scan prove there is no Horizon use?** No. Unsupported patterns can remain; incomplete signals are explicit where recognized.

**Were complete external repositories benchmarked?** Not yet. Issue #2 scopes a reproducible adjudicated benchmark. Do not claim precision/recall.

**Has SDF or Drips endorsed the repository?** No claim of endorsement or approval.

## Official application steps requiring maintainer access

1. Sign into https://www.drips.network/wave using the authorized GitHub account.
2. Open **Maintainers → Orgs and Repos**. Install/verify the Drips Wave GitHub App for the HoriSift organization, sync the public repository, and select the correct Stellar Wave Program.
3. Review current **personal and organization application limits** and any repository-specific eligibility, points budgets and reviewer guidance before applying. Application consumes a slot where limits apply, even if rejected.
4. Submit the repository for organizer review **only with explicit owner approval**. Wait for an actual approved status before assuming issues can be offered to contributors through Wave.
5. Once admitted, choose eligible issues in the Maintainers → Issues dashboard; recheck points budget/label state and handle contributor assignment/review promptly. Do not add invented Wave tags or complexity values.

Official policy (checked 2026-10-10): https://docs.drips.network/wave/maintainers/participating-in-a-wave/ ; https://docs.drips.network/wave/maintainers/repo-application-limits/ ; https://docs.drips.network/wave/maintainers/points-budgets/ ; https://docs.drips.network/wave/terms-and-rules/ .

**Decision:** An evidence pack and issue backlog are prepared; actual **application eligibility, remaining slots and acceptance are unverified** until dashboard review. No submission is claimed.

## Verified follow-up evidence

The historical constructor correction on code commit `3955813e40e8ab828f32607829b28d91af87f758` is CI-verified (https://github.com/HoriSift/HoriSift/actions/runs/38014903027, six successful jobs, 503 standard tests). The public Stellar Wind example now yields explicit incomplete/manual review rather than an incorrect clean scan. This **does not close issue #1**, which covers broader historical SDK semantics. GitBook was publicly published at https://oobayemi.gitbook.io/horisift-documentation/; user account onboarding/Drips approval still require confirmation.

## Final reviewed source and candidate identity (2026-10-10)

- Reviewed source/doc SHA: `cedf8e94ed9abaf8beb660f717393ce0dbdd474d`, CI https://github.com/HoriSift/HoriSift/actions/runs/38015163199 — completed SUCCESS, six OS × Node jobs; 503 standard tests, 35 intentional quality-gate tests, 15 public-source tests and 8 Ubuntu24 stress tests. Each job also verified private package consumer installation.
- Ubuntu/Node24 produced the corrected source/README `0.1.0-rc.1` private tarball with **12 entries, 28,832 bytes**, SHA-256 `16ca86f5b381f7e894875b5fd326c3272cc05743b943e22a05da13ded7b5afb3`. This digest identifies that specific build. Earlier package hashes from older README/code are not current.
- Public GitBook: https://oobayemi.gitbook.io/horisift-documentation/ ; 7 pages; 15 open issues #1–#15, with no Wave approval or application submission.
- **Assessment:** source, docs, tests, GitBook and contributor queue are prepared for maintainer-controlled Drips *repository application review*. The private npm/GitHub release gate remains HOLD and whole-repo precision/recall remains unmeasured (issue #2); these must be disclosed and not represented as completed.
