# Contributing and Wave issues

HoriSift is a public MIT-licensed repository and welcomes narrowly scoped, tested contributions. Work on exactly one issue per PR, identify the affected rule/detector behavior, and preserve conservative unknowns and deterministic reports.

1. Read [CONTRIBUTING.md](https://github.com/HoriSift/HoriSift/blob/main/CONTRIBUTING.md), [AGENTS.md](https://github.com/HoriSift/HoriSift/blob/main/AGENTS.md) and [engineering evidence](https://github.com/HoriSift/HoriSift/blob/main/docs/TESTING.md).
2. Run `npm ci --ignore-scripts`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run security:check` and `npm run release:verify` if packaging is changed.
3. Include positive, negative, shadowed/aliased, invalid-source and process-level cases when relevant. Never execute untrusted fixtures.
4. Explain expected CLI output and disclose remaining uncertainty. Do not assert green CI until the exact SHA's jobs pass.

Open issues: [GitHub issues](https://github.com/HoriSift/HoriSift/issues). Drips Wave admission is organizer-controlled; a public issue does **not** mean it has been admitted to a Wave. [Drips maintainer instructions](https://docs.drips.network/wave/maintainers/participating-in-a-wave/).
