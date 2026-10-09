# HoriSift architecture decision specification

**Status:** File discovery and syntax-only source parser implemented and tested as library modules (2026-10-09). Horizon detection, rule evaluation, CLI and report rendering remain planned. API mapping notes checked against official Stellar guidance on 2026-10-09.

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
- `src/analysis/`: supported API usage evidence; risks and uncertainty must remain separate.
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
