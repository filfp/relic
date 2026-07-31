# Security Policy

Relic reads repository knowledge, installs project-local skill files, and serves a
localhost-only viewer. Treat repository-authored canonical documents and artifacts as
untrusted input. Security issues include path or symbolic-link escapes, active content
execution, unsafe artifact delivery, writes outside the selected engine root,
unexpected network exposure, and compromised distribution artifacts.

## Supported Versions

Only the latest published version of `relic-cli` receives security fixes.

| Version | Supported |
|---|---|
| latest | ✅ |
| older | ❌ |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report privately via GitHub's built-in mechanism:
**[Report a vulnerability](https://github.com/filfp/relic/security/advisories/new)**

Include:

- the affected Relic version and installation channel;
- a description of the vulnerability and its potential impact;
- minimal steps or a repository fixture that reproduces it;
- any suggested fix or containment if you have one.

You will receive a response within 7 days. If the issue is confirmed, a fix will be
released as soon as possible and you will be credited in the changelog unless you
prefer to remain anonymous.

Do not include secrets, private repository content, or production credentials in a
report. Use synthetic knowledge files whenever possible.
