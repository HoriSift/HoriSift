# ADR 0001 — Local-first, conservative static analysis

- **Date:** 2026-10-09
- **Status:** Accepted for initial implementation, subject to empirical revision

## Context

Stellar app teams need codebase-wide inventory of Horizon usage, but imported code and third-party dependencies are untrusted. String grep creates false positives; full dynamic execution would be unsafe and unreliable. EventParity already performs data-source parity testing, so HoriSift must not duplicate its network comparison workflow.

## Decision

Use TypeScript Compiler API AST inspection for JS/TS, conservative import/symbol resolution, an explicit unknown bucket, data-backed migration rules, and local deterministic redacted reports. Do not contact any network or execute inspected code by default. Use one repo for CLI and later static site.

## Consequences

We will miss some aliasing, indirect wrappers and runtime-generated URLs; a negative result does not certify readiness. Versioned rules require official-source maintenance. The CLI will need resource bounds and false-positive fixtures before usable release. Other languages and live parity checks are out of scope.
