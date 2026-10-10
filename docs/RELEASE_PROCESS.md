# Release and application gate

No release or deployment has been made by the foundation implementation.

Before a release: verify product-specific tests (including malformed/adversarial fixtures); `npm ci`, typecheck, lint, build and smoke checks; CLI package/bin correctness; OS/Node matrix; rule source currency; package/license/security contents; known limitations; installation from produced artifact; changelog; recorded commit SHA and successful CI run URLs. Inspect release artifacts and checksums where useful. Obtain explicit maintainer authorization before publishing a release or site.

Stellar Wave eligibility is a separate evidence/authorization decision. Re-check the dated official playbook and current official program rules; do not imply release or CI means approval. Submit only with authorization.

For the **unpublished static landing page**, first run `npm run site:verify` on the exact approved commit; verify real browser and screen-reader behavior, mobile/keyboard navigation, external link validity and HTTP security headers of the intended host. Require explicit owner approval before choosing hosting provider/domain, changing production configuration or deploying; green CI or static tests alone do not authorize publication. Keep known SDK false-negative disclosure linked to issue #1 until a verified fix exists.
