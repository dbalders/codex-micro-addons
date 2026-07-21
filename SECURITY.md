# Security

## Runtime boundary

Codex Micro Addons does not quit, copy, patch, replace, or re-sign `/Applications/ChatGPT.app`. It pre-starts the local injector, then sends the already-running Electron main process Node's non-terminating `SIGUSR1` signal, which briefly exposes the main-process inspector on `127.0.0.1:9229`. The launcher verifies that the listening PID is the exact Codex process before connecting. The injector evaluates only the entrypoints present under the locally built helper's `Contents/Resources/addons/` directory.

Node's signal-opened inspector has no authentication. A different process running as the same macOS user could race the injector, discover its random WebSocket target, and evaluate code in Codex during the short attachment interval. Use this unsupported tool only on a trusted Mac without untrusted local processes. The injector closes and verifies the endpoint on success and failure; the launcher retries cleanup and reports a blocking error if it remains open. The injected code and its lightweight main-process listeners remain active until Codex exits; reopening the helper replaces the previous addon selection and disposes deselected renderer addons.

## Addon permissions

Every `addon.json` declares `hostActions`. The sidecar validates both the requesting addon id and action before performing anything outside the renderer.

- `conversation-scroll` declares no host actions. It stores `codex-micro-addons.conversation-scroll.mode` in renderer-local storage and queries DOM structure to identify the conversation viewport. It does not read or transmit conversation text.
- `focus-thread-window` declares only `focus-codex-window`. That action runs a fixed AppKit activation script for the already-validated Codex PID, then focuses the exact Electron window that emitted the allowlisted request. No addon payload text is executed as code or interpolated into the operating-system command.

The project sends no analytics and makes no addon-originated network requests.

## Reporting a vulnerability

Report vulnerabilities privately through GitHub Security Advisories. Do not open a public issue for a vulnerability that could expose user data or permit unintended code execution.
