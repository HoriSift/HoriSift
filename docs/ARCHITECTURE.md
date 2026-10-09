# HoriSift architecture decision specification

**Status:** Discovery, safe reads, syntax parsing, Horizon detection, 25-rule catalog and deterministic static migration risk evaluator implemented/tested internally (verified 2026-10-10). CLI and user-facing report rendering remain future milestones.

## Stack decision

- **Implementation:** TypeScript (strict, `NodeNext`/ESM), targeting Node.js 22.12+ and 24 LTS. Node 24 is Active LTS on this date; Node 22 is Maintenance LTS. Initial platform CI: Ubuntu, Windows, macOS, one Node 24 run each; add Node 22 compatibility coverage.
- **Parser:** Pinned TypeScript Compiler API 6.0.3 (`typescript` runtime dependency; lockfile committed). `src/parser/parse.ts` uses `createSourceFile` with explicit JS, JSX, TS, TSX modes. `src/parser/read.ts` revalidates discovery candidates, rejects symlinks and invalid UTF-8, bounds reads, and never executes source. Syntax-only ESM/CommonJS SDK import facts and const aliases are not semantically resolved.
- **CLI:** `commander` (supported Node versions), to be installed and locked at CLI implementation; avoid bringing in a web framework or Stellar SDK as runtime dependencies for offline source scanning.
- **Tests:** Node's built-in `node:test` for no-dependency foundation and deterministic integration tests; consider Vitest later only if fixtures or snapshot ergonomics warrant added upkeep.
- **Website:** A static accessible site later, in this repository (`site/`), without a framework unless interactivity justifies it.
- **Dependency policy:** `npm ci` with committed lockfile and runtime `typescript@6.0.3`, dev `@types/node@22.15.30`; `tsc --noEmit` enforced in CI. Add other dependencies only with evidence.

## Intended data flow

`CLI arguments -> validated config -> bounded local discovery -> JS/TS AST parser -> symbol/import resolution -> detectors -> versioned rules -> risk evaluation -> normalized report -> text/JSON writer -> exit policy`

Each stage must be independently testable; downstream layers accept typed evidence rather than reparsing strings. A report may contain `unknowns` and `diagnostics` without any classified findings. No file contents, telemetry, or network traffic by default.

## Module responsibilities (planned, create only when substantive)

- `src/cli/`: arguments, validation, status/exit contract.
- `src/scanner/`: implemented deterministic, bounded directory iterator; eight JS/TS extensions; literal path exclusions; safe symlink skipping; canonical relative paths; incomplete diagnostics; metadata checks only (no source content read).
- `src/parser/`: implemented bounded strict-UTF-8 source reading, AST parser, 1-indexed UTF-16 line/column, syntax errors and dynamic-module diagnostics, syntax-only imports and const aliases. Full symbol/import binding resolution and migration evidence remain future work.
- `src/analysis/`: `horizon.ts` is the local-only detector of SDK/HTTP/response-shape evidence; `risk.ts` is the conservative assessment engine consuming exact vetted classifications. It separates static investigation severity from evidence confidence, preserves unknowns, and produces reproducible prioritized risk results. Neither module certifies RPC compatibility.
- `src/rules/`: validated, versioned mapping records and official evidence references.
- `src/reports/`: stable report model, canonical serialization, terminal formatting, security redaction.
- `src/utils/`: bounded, platform-independent, narrowly shared helpers.

## Scanner threat model

Inspect repositories as untrusted input. Never `require()`/`import()` a scanned file, evaluate `*.config.js`, invoke package scripts, or follow symlinks outside root. Default symlink policy: skip all symbolic links with a recorded diagnostic. Reject traversal outside canonical root, limit recursion depth (default proposal 32), files (20,000), total scanned bytes (64 MiB), and per-file bytes (1 MiB), with explicit fatal/incomplete outcome. Bound parser time using input size; hard timeouts require worker isolation if later testing shows event-loop blocking. Check secrets are never reproduced in diagnostic text.

## Evidence and location contract

Normalize relative POSIX file path (never absolute), start/end line and column (1-indexed), detector ID, normalized pattern category, and confidence. No raw source excerpt, request URL query string, variable value or authorization header by default. A detector must not infer that a string literal mentioning `/payments` is an executable HTTP call.

## Rule contract

A rule is a versioned data record: `id`, `version`, `name`, `detectionKind`, `matchTarget`, `mappingKind`, `severity`, `confidence`, `recommendation`, `officialSources[]`, `limitations[]`. `mappingKind` is one of `direct`, `conditional`, `indexer-required`, `no-direct-rpc-equivalent`, `unknown`. Rules are built from official primary references and reviewed before activation; rules must reject empty source attribution, unsupported mapping values, or broad wildcard advice.

## Deterministic report contract (`schemaVersion=1.0.0` proposed)

```json
{
  "schemaVersion": "1.0.0",
  "toolVersion": "0.0.0",
  "ruleSetVersion": "0.0.0",
  "root": ".",
  "status": "incomplete",
  "summary": { "filesInspected": 0, "findings": 0, "unknowns": 1, "diagnostics": 0 },
  "findings": [],
  "unknowns": [{ "kind": "empty-repository", "file": null, "reason": "No supported source files were found" }],
  "diagnostics": []
}
```

This is a **design sample**, not software output. No `scannedAt`, elapsed milliseconds, machine paths, unredacted source or randomness in deterministic JSON. Findings sorted by `(file,startLine,startColumn,ruleId,detectorId)` with stable ID derived from normalized fields. Unknowns/diagnostics sorted deterministically; object keys fixed by serializer. Severity (`info`, `low`, `medium`, `high`) and evidence confidence (`high`, `medium`, `unknown`) are separate. `status` is `complete` or `incomplete`, **never `ready`**.

## Proposed typed interface sketches (not implemented)

These are contracts to guide implementation, not exported TypeScript APIs yet. Conversion from AST evidence into findings must be explicit and tested.

```ts
type Severity = 'info' | 'low' | 'medium' | 'high';
type Confidence = 'high' | 'medium' | 'unknown';
type MappingKind =
  | 'direct' | 'conditional' | 'indexer-required'
  | 'no-direct-rpc-equivalent' | 'unknown';
type DetectionKind = 'sdk-call' | 'http-call' | 'response-shape' | 'stream';

interface SourcePosition { line: number; column: number } // positive 1-based integers
interface SourceLocation {
  file: string; // POSIX-relative to scan root; never absolute
  start: SourcePosition;
  end: SourcePosition;
}
interface OfficialReference {
  url: string; // https://developers.stellar.org/ or verified official SDK source
  checkedDate: string; // YYYY-MM-DD
  note: string;
}
interface MigrationRule {
  id: string; version: string; name: string;
  detectionKind: DetectionKind;
  matchTarget: string; // normalized endpoint/method pattern, not raw source
  mappingKind: MappingKind;
  severity: Severity;
  confidence: Confidence;
  recommendation: string; // qualified human review action
  officialSources: OfficialReference[]; // one or more
  limitations: string[];
}
interface DetectionEvidence {
  detectorId: string;
  detectionKind: DetectionKind;
  matchTarget: string;
  location: SourceLocation;
  confidence: Confidence;
}
interface Finding {
  id: string; ruleId: string;
  severity: Severity;
  confidence: Confidence;
  mappingKind: MappingKind;
  location: SourceLocation;
  detectorId: string;
  recommendation: string;
  officialSources: OfficialReference[];
}
interface Unknown {
  kind: string;
  file: string | null;
  reason: string; // sanitized and bounded; no raw source
}
interface Diagnostic {
  code: string;
  file: string | null;
  message: string; // sanitized, stable, no platform absolute path
}
interface ScanReport {
  schemaVersion: '1.0.0';
  toolVersion: string; ruleSetVersion: string; root: '.';
  status: 'complete' | 'incomplete';
  summary: { filesInspected: number; findings: number; unknowns: number; diagnostics: number };
  findings: Finding[]; unknowns: Unknown[]; diagnostics: Diagnostic[];
}
```

`SourceLocation` boundary: AST offsets convert to one-indexed line/column; start must precede or equal end. Unknowns can exist with no location for repository-level coverage gaps. Stable IDs must be collision-resistant across rule/location combinations and not include source text or local absolute paths. All strings derived from inspected repositories must be sanitized and length-bounded before serializing.

## Error taxonomy and handling

| Category | Example | Policy |
|---|---|---|
| `usage` / `configuration` | invalid flag or config file | Exit 2, no scan results claimed |
| `filesystem` | root unavailable or unsafe traversal | Exit 3 if integrity cannot be assured; recorded sanitized diagnostic |
| `resource-limit` | file/byte/depth budget exceeded | Exit 3 if scan cannot continue safely, or incomplete if bounded skip is proven |
| `parse-error` | malformed source text | Diagnostic plus incomplete if relevant coverage lost; never execute source |
| `unsupported-pattern` | dynamic URL, opaque wrapper | Unknown; incomplete unless explicitly allowed |
| `rule-definition` | bad metadata or missing official citation | Fatal, never silently disable rule |
| `internal` | unexpected exception | Exit 3 with safe message, no source leak |

An error reported during scanning must not silently turn into `status=complete`. Detailed and reproducible error handling comes with implementation and tests.

## Migration semantics that constrain rules

Official guidance distinguishes REST/HAL versus JSON-RPC; a one-to-one endpoint replacement is not always available. `GET /accounts/{address}` via RPC `getLedgerEntries` omits Horizon's joined trustlines; history endpoints may require an indexer or XDR processing. `getEvents` is not a blanket payment/effect replacement; classic events depend on network/provider configuration and protocol history. RPC's history is bounded (default approximately seven days). Hence a detected API dependency is evidence of migration **work**, not automatically an application break.

## Decision records

See [ADR 0001](decisions/0001-local-first-static-analysis.md) for platform and safety tradeoffs. This architecture will be revised when verified implementation evidence contradicts assumptions.

## Implemented conservative detector boundary

`detectHorizonUsage(file,source)` accepts a bounded, validated JS/TS path/string, reuses `parseSource` syntax safeguards and returns normalized findings and unknowns without raw source text. `detectHorizonRepository(root,options)` stitches together bounded discovery, safe reads, parser and detector; it is a library interface, **not a public CLI**. Immutable lexical aliases and ESM/CommonJS imports are recognized. Shadowed or reassigned names cannot be promoted to trusted SDK objects; dynamic Horizon URLs, computed methods and uncertain HTTP methods become incomplete. Only selected builder chains are followed, with a 48-level alias recursion budget. HAL `_embedded.records` evidence requires a recognized Horizon HTTP response; plain text or unrelated objects do not qualify. No migration-rule equivalences, severity, confidence or readiness claims are produced by this detector.

Official SDK source reference checked 2026-10-09: https://github.com/stellar/js-stellar-sdk/blob/494cf9e26662ef4ff91afa013d5dfc37bd1f2286/src/horizon/server.ts. Main Horizon-to-RPC migration guide: https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc. Evidence can change with SDK/API versions and must be refreshed for active rules.

## Implemented versioned rule catalog

`src/rules/catalog.ts` exports 25 immutable exact-match rules (`RULE_SET_VERSION=1.0.0`), dated official source attribution, conservative mapping kinds (`direct`, `conditional`, `indexer-required`, `no-direct-rpc-equivalent`, `unknown`), candidate RPC methods, static triage defaults, limitations and qualified recommendations. `classifyHorizonFindings` matches exact validated `HorizonKind` plus normalized detector pattern; no wildcard/path-prefix or approximate match is permitted. Otherwise the safe fallback `horizon.unmapped-pattern` preserves `unknown`; `classifyHorizonDetection` preserves incomplete status, unknowns and diagnostics. Rule defaults are not evaluated per-application risks. No post-processing of detected source text into outputs, and no raw credentials/URLs in classifications. Catalog validation rejects invalid method names, unsupported mapping kinds, missing official source references, duplicate IDs/matches and unsafe patterns. Each of the 25 rules has a real detector fixture in tests.

Versioned catalog and full source register: `docs/RULE_CATALOG.md`. Implementation commit 06e9651fad5cd51df27d488117e8a53d527b3d21 (CI https://github.com/HoriSift/HoriSift/actions/runs/38002363095).

## Static risk evaluator — implemented

`src/analysis/risk.ts` exports `assessHorizonUsage`, `assessClassifiedDetection` and `assessHorizonRepository`; all are internal library APIs. `RISK_SCHEMA_VERSION=1.0.0`. The evaluator uses vetted rule metadata, then adds consistent priority floors: indexer-required or no-direct-equivalent at least `high`, unknown mapping at least `medium`, and streaming at least `high`. Evidence confidence remains independent; unknown mapping implies `confidence=unknown`. Proven method mapping does **not** demonstrate response parity or readiness. Findings are sorted by descending severity, then evidence uncertainty, normalized path/line and rule ID; stable SHA-256-derived IDs depend only on normalized evidence and catalog version. Unknowns and diagnostics are validated, stripped of arbitrary source-provided messages and sorted; duplicate exact evidence is deduplicated. All inputs are read-only, and static assessment never runs source code. `status=incomplete` prevails over findings if relevant coverage is lost; empty-with-no-findings is `no-supported-evidence`, not `safe`.

See `docs/RISK_ANALYSIS.md` for detailed schema and limitations. Cross-platform evidence: https://github.com/HoriSift/HoriSift/actions/runs/38003322270 on implementation 9bb554e0eeb33f6240786dda92930135332f37cb.
