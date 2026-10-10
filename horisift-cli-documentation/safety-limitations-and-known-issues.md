# Safety, limitations, and known issues

**HoriSift is an investigation tool, not a migration certification tool.**

**Verified conservative remediation:** Historical `stellar-sdk` `StellarSdk.Server` constructors (when bound to the SDK import) now yield explicit `LEGACY_SDK_SERVER` unknown, `incomplete` status and exit 4 instead of an incorrect clean report. Six jobs passed at [3955813e](https://github.com/HoriSift/HoriSift/commit/3955813e40e8ab828f32607829b28d91af87f758). This does not prove historical API method compatibility or eliminate all false negatives.

**Still unknown:** whole-repository precision/recall, wrappers and dynamic aliases, custom Horizon providers, runtime application migrations, independence of schema/security review, and public npm registry installation. See [historical SDK issue](https://github.com/HoriSift/HoriSift/issues/1) and [real-repository benchmark](https://github.com/HoriSift/HoriSift/issues/2).

**Safety defaults:** bounded local reads; no target code execution or target package installation; symlink/path safety; deterministic relative-file reports; no raw source, secrets or credentials in normal outputs. These are automated safeguards, not a third-party security audit.

**Publishing:** GitBook developer documentation is public; the older static landing page has not been deployed on Vercel. The CLI candidate remains unpublished and private, and no Drips Wave organizer acceptance is claimed. [Detailed limitations](https://github.com/HoriSift/HoriSift/blob/main/docs/LIMITATIONS.md), [security policy](https://github.com/HoriSift/HoriSift/blob/main/SECURITY.md), and [Wave application evidence](https://github.com/HoriSift/HoriSift/blob/main/docs/WAVE_APPLICATION.md).
