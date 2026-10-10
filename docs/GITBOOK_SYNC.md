# GitBook repository sync

The existing public site is [HoriSift Documentation](https://oobayemi.gitbook.io/horisift-documentation/).
Its seven pages are preserved in `horisift-cli-documentation/`, with explicit navigation in `SUMMARY.md`.
The root `gitbook-docs.yaml` describes the existing single-space site. It uses the current
[official GitBook schema](https://api.gitbook.com/gitbook-docs.yaml), checked 2026-10-10.

## Finish the pending site-level connection

In the existing Git Sync dialog shown in the screenshot:

1. Select repository **HoriSift/HoriSift**, branch **main**.
2. Set **Project directory** to **./**. This is the directory containing `gitbook-docs.yaml`,
   not the content directory `horisift-cli-documentation`.
3. Refresh the configuration field if the dialog still shows its cached missing-file error.
4. Choose **GitHub to GitBook** for the initial content direction and click **Sync**.
5. Verify the public site still contains all seven pages and that the Getting started page
   describes the verified legacy-constructor warning rather than a fix awaiting verification.

Do not remove the current site or Git Sync connection to fix the missing file. The site and
space already exist. This repository intentionally excludes internal engineering ledgers from
the GitBook content directory. The space-level `.gitbook.yaml` selects the homepage and summary;
it does not replace the required site-level `gitbook-docs.yaml`.

## Documentation checks

The standard test suite checks that all seven pages appear exactly once in navigation,
relative links stay within the documentation directory and resolve, and the documented
candidate version matches the package manifest. These checks do not prove a remote sync
completed. Record the observed GitBook installation status separately after initialization.
