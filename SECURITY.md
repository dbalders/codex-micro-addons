# Security

## Runtime boundary

Codex Micro Plus launches the installed Codex desktop app with Electron remote debugging enabled on a random port bound to `127.0.0.1`. The sidecar uses that endpoint to evaluate the checked-in `src/injected.js` code in the primary renderer.

The endpoint is not intentionally exposed beyond localhost and closes when Codex exits. Local processes running under the same user account may still be able to discover and access it. Do not use a build whose source you have not reviewed.

## Data handling

The extension does not send analytics or network requests. Its only persistent value is `codex-micro-plus.encoder-mode` in the Codex renderer's local storage. It does not read conversation text.

## Reporting a vulnerability

After the GitHub repository is published, report vulnerabilities privately through GitHub Security Advisories. Do not open a public issue for a vulnerability that could expose user data or permit unintended code execution.
