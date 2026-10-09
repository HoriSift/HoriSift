# HoriSift contributor and agent safeguards

1. Read `docs/PROJECT_HANDOFF.md`, `docs/PHASE_BUILDS.md`, and current source before modifying files; verify live GitHub head and CI when available.
2. Treat current source and verified CI on the **same commit SHA** as stronger evidence than prior chats and historical handoffs.
3. Follow `docs/ARCHITECTURE.md` and `docs/PRODUCT_SPEC.md`. Confirm current official Horizon and RPC behavior before writing migration rules. Record URL, checked date, and limitations.
4. HoriSift analyzes untrusted repositories: NEVER run scanned code, install their packages, evaluate repo config as JS, follow symlinks unsafely, upload scanned source, or leak secrets into output.
5. Keep path traversal and resource consumption bounded. Report unsupported syntax, dynamic requests, and unreadable files as incomplete/unknown; never silently declare migration readiness.
6. Keep JSON deterministic (normalized relative POSIX paths, stable findings order, no timestamps or absolute paths by default). Keep evidence identifiers and location only; no source snippets or raw request bodies by default.
7. Add genuine positive, negative, malformed, adversarial, boundary, location, and regression tests for touched behavior. Never skip failing tests or weaken lint to manufacture success.
8. Version migration rules and report schema. Do not invent SDK methods or map a Horizon endpoint to RPC unless official guidance supports the distinction between direct, conditional, and indexed work.
9. Public `README.md` must not contain phase numbers, private tracking, internal roadmap milestones, or invented usage examples/badges. Track phases only in `docs/PHASE_BUILDS.md`.
10. Make accurate conventional commits. Record actual commit SHA, checks executed, CI URLs, limitations, and next step in `docs/PROJECT_HANDOFF.md`. Do not fabricate users, tests, CI, or approvals.
11. Do not publish releases, deploy sites, change production configuration, or submit Wave applications without explicit owner authorization.
