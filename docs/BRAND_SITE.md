# HoriSift brand and static-site engineering record

**Authored:** 2026-10-10. **Status:** Site source and original SVG logo created, with offline build and static accessibility/link/security verification. **Not deployed.** No public URL or domain has been selected, configured or launched.

## Design and provenance

The two original HoriSift vectors in `site/assets/` were hand-authored as SVG path and text sources for this repository. The symbol combines a horizon arc with descending horizontal filtering strokes: Horizon usage being sifted into evidence and unknowns. They do not derive from a Stellar Development Foundation asset, external brand kit, stock image, or generated third-party logo. Colors: deep navy `#071527`, ink `#eff7ff`, softened copy `#b8c9d9`, mint `#69edc9`, pale lime `#b7ef91`, with amber error/uncertainty distinctions. The site uses system fonts and makes no network requests for fonts, telemetry, code, images or JavaScript. Editable SVG files are the canonical artwork; the site has no separate raster/hosted visual dependency.

The homepage deliberately uses only source-evidenced capability statements: development-only read-only CLI, 25 advisory rules, source locations, explicit unknowns, no hosted upload. Its illustrative example is based on the fixed Axelar upstream source file, but is labelled as a schematic, not an exact output dump or proof of migration readiness. The public evidence table reflects four **individual** source files, not three scanned whole repositories: Axelar 2 findings/1 unknown, Soroswap 1/1, Stellar Wind legacy 0/0 (a **known false negative**), and Stellar Wind non-Horizon control 0/0. The disclosed legacy gap is tracked at [issue #1](https://github.com/HoriSift/HoriSift/issues/1). The site links to exact authentic JSON reports in `docs/PUBLIC_VALIDATION.md` and current checkout CLI instructions in `docs/CLI_USAGE.md`. There are no fictitious installs, testimonials, deployment badges, user counts, traffic graphs or SDF endorsement claims.

Authoritative external context checked 2026-10-10: [Stellar migration guide](https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc) and [RPC overview](https://developers.stellar.org/docs/data/apis/rpc). These explicitly distinguish Horizon REST/HAL from RPC JSON-RPC and note that history/indexing is not a trivial drop-in replacement. The website does not describe automatic migration or guaranteed safety.

## Local-only build and preview

```sh
npm ci --ignore-scripts
npm run site:verify
cd dist-site
python -m http.server 8000 --bind 127.0.0.1
# Open http://127.0.0.1:8000/ in a browser on your own machine.
```

`site:build` writes exactly four static files to the ignored `dist-site/`; it does not upload, publish or deploy them. It copies source bytes exactly and rejects symlink/missing assets. The site and SVG logo sources are in `site/`. The dependency-free static site code needs no server or npm runtime *after building*; `npm ci` is for development verification.

## Validation contract and limits

- `npm run site:verify` performs the deterministic offline site build, static audit, and **33 dedicated positive/negative/injection/regression cases**. `npm test` also includes the 33 ordinary integration tests. CI runs this on Ubuntu/Windows/macOS × Node 22/24. These are checks of static markup and assets, not a claim of automated full browser or screen-reader conformance.
- Static checks cover `lang`, `<title>`, meta description and viewport, navigation/main/footer landmarks, one H1, visible keyboard skip link/focus rules, image alt text and intrinsic dimensions, reduced-motion CSS, breakpoints at 1050px/690px and horizontally scrollable tables. Link validator checks anchor IDs, local GitHub documentation paths and an allowlist of external official URLs. It does **not** live-request external links on each test run.
- The color audit uses WCAG relative-luminance contrast formulas and 4.5:1 or better for selected paragraph, warning state, button and terminal text pairs. Contrast is not a substitute for checking every possible rendered state.
- Security checks reject inline scripting, event handlers, active embeds, external CSS `@import`, remote fonts, unapproved outbound links, malformed or symlink assets, UTF-8/line-ending issues and mismatches between generated and source output. The page has a restrictive CSP and no JavaScript.
- Dedicated tests deliberately inject broken navigation, inaccessible images, script tags, external tracker links, SVG `foreignObject`, broken media, missing responsive/focus rules and false release claims. Gate failures are required in these negative fixtures.
- **Unverified:** Automated full axe-core / WCAG audit, actual screen reader behavior, all-platform pixel-perfect browser screenshots, color-blind user research, live-host security headers (including `frame-ancestors`), live HTTP response cache/canonical behavior, and remote 404 monitoring. A local Chromium/Playwright navigation attempt in this workspace was **blocked by administrator policy**, so no browser-rendered validation is claimed. These remain follow-up work before any public deployment.

## Maintenance and release safeguards

Maintainers must keep site examples tied to pinned genuine source observations; when a detector bug is fixed, update evidence and this page to avoid stale misleading results. Do not remove the historical false-negative disclaimer until issue #1 is actually fixed and cross-platform CI verifies it. The source contains no `<script>`, third-party CSS/font, tracking or hosted action. Never add claimed downloads/install instructions unless a real public package and release verification exist. Preserve root README without internal phase numbers. Site publishing, domain setup, production config changes and any grant application require explicit owner authorization; current site remains source-only.

## GitHub code and CI evidence (2026-10-10)

- Verified site/source implementation commit: `0d8aa1c545746eb8ef3effcba649e44103a82f5c`.
- Six-platform source/check CI: https://github.com/HoriSift/HoriSift/actions/runs/38010802527 — **SUCCESS**. All Ubuntu/Windows/macOS × Node 22/24 jobs passed site build, static audit and 33 dedicated site tests, alongside 475 standard tests per job, 24 CI negative-gate tests; Ubuntu/Node24 additionally ran 8 stress tests.
- Public site deployment URL: **none**. The artifact remains an offline static website. Browser rendering and independent accessibility certification are **not verified**; see limitations above.
