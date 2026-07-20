# Security

## Runtime boundary

Codex Micro Addons launches the pre-existing `/Applications/ChatGPT copy.app` with an isolated user-data directory and Electron debugging enabled on a random port bound to `127.0.0.1`. It does not quit or modify the regular Codex app. The sidecar evaluates only the entrypoints present under the locally built helper's `Contents/Resources/addons/` directory.

The endpoint closes when Codex exits. Other processes running as the same macOS user may still discover localhost services, so users and agents should review every selected addon folder before installation.

## Addon permissions

Every `addon.json` declares `hostActions`. The sidecar validates both the requesting addon id and action before performing anything outside the renderer.

- `conversation-scroll` declares no host actions. It stores `codex-micro-addons.conversation-scroll.mode` in renderer-local storage and queries DOM structure to identify the conversation viewport. It does not read or transmit conversation text.
- `focus-thread-window` declares only `focus-codex-window`. That action runs a fixed JXA/AppKit activation script for the helper-launched process id; no addon payload text is interpolated into the operating-system command.

The project sends no analytics and makes no addon-originated network requests.

## Reporting a vulnerability

Report vulnerabilities privately through GitHub Security Advisories. Do not open a public issue for a vulnerability that could expose user data or permit unintended code execution.
