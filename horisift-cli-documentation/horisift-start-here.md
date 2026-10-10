# HoriSift — Start here

**Local-first Horizon dependency investigation for Stellar JavaScript and TypeScript.**

HoriSift scans a local source directory, identifies supported Stellar SDK/Horizon and HTTP usage, and creates deterministic reports with evidence and uncertainty. It does **not** execute scanned project code, migrate apps automatically, validate mainnet behavior, or certify RPC compatibility.

**Current status (10 October 2026):** An unpublished `0.1.0-rc.1` private CLI candidate has passed Ubuntu/macOS/Windows × Node 22/24 packaging tests. GitHub repository: [HoriSift/HoriSift](https://github.com/HoriSift/HoriSift). No public npm release or Wave approval is claimed.

Read [Getting started](getting-started.md) to run from source, [CLI reference](cli-reference.md) for exit codes, [Public examples](reproducible-public-examples.md) for pinned source evidence, and [Reports](reports-and-migration-guidance.md) for the output contract. [Limitations](safety-limitations-and-known-issues.md) explicitly explains incomplete scans and historical SDK syntax. [Contributor guide](contributing-and-wave-issues.md) explains issue work and tests.

**15 scoped GitHub issues** are available in the [contributor queue](https://github.com/HoriSift/HoriSift/blob/main/docs/WAVE_ISSUES.md). These issues are not automatically admitted to any Wave Program.

HoriSift is independent and is not endorsed by the Stellar Development Foundation. Official migration behavior: [Stellar migration guidance](https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc).
