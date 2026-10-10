# Security policy

HoriSift is not independently security-audited and is not yet publicly released. The implemented scanner reads untrusted source code with bounded, read-only operations. Do not run scanned code or install dependencies from an inspected repository. Known filesystem-race and parser resource-containment limits are tracked in issues #11 and #12; a passing automated gate does not resolve those limits.

**Report suspected vulnerabilities privately.** Prefer GitHub's repository-level private vulnerability reporting if enabled. If that feature is unavailable, contact a repository owner privately through their GitHub profile; do not publish proof-of-concept exploits or secrets in a public issue. No dedicated security contact address has been verified yet; establishing one is tracked as a pre-release requirement.

Scope includes unsafe path traversal, symlink handling, parser denial-of-service, leakage of inspected source or credentials, and supply-chain risks. No response-time SLA or unsupported disclosure channel is promised.
