# Codex Micro Addons

A source-first catalog of optional Codex Micro enhancements for macOS. Each addon lives in its own folder and users or agents install only the addons they explicitly select.

`ChatGPT.app` is never edited, copied, replaced, or re-signed.

## Addon catalog

| Addon | What it does | Folder |
| --- | --- | --- |
| Conversation scrolling | Uses the knob to scroll the active conversation up and down. | [`addons/conversation-scroll`](addons/conversation-scroll) |
| Focus thread window | Brings Codex to the foreground when a mapped thread button opens its thread. | [`addons/focus-thread-window`](addons/focus-thread-window) |

List the catalog locally:

```sh
./scripts/list-addons.sh
```

## Give it to an agent

The repository-level [`AGENTS.md`](AGENTS.md) tells an agent how to inspect the catalog, ask which addons the user wants, install only those folders, and report separate synthetic and physical-hardware evidence.

Example request:

> Clone `https://github.com/dbalders/codex-micro-addons`, read `AGENTS.md`, show me the available addons, and install `conversation-scroll` and `focus-thread-window` after checking them.

There are no release binaries. The helper is composed from the selected source folders on the user's own Mac.

## Install

```sh
git clone https://github.com/dbalders/codex-micro-addons.git
cd codex-micro-addons
./scripts/install.sh conversation-scroll focus-thread-window
```

Install just one addon by passing only its folder id:

```sh
./scripts/install.sh conversation-scroll
```

The installer never assumes “all.” Running it without addon ids prints the catalog and exits. It builds an ad-hoc-signed `~/Applications/Codex Micro Addons.app` containing only the selected addon folders.

## Use

Open **Codex Micro Addons** instead of opening ChatGPT directly. If Codex is already running, approve **Quit and Relaunch** so the selected addons can load.

- **Conversation scrolling:** Open **Settings > Codex Micro > Knob**, select **Conversation scrolling**, turn clockwise to scroll down, and turn counter-clockwise to scroll up. Selecting a native knob mode restores native handling.
- **Focus thread window:** Leave Codex in the background and press a mapped Codex Micro thread button. Codex should open that thread and become the focused macOS window.

## Requirements and compatibility

- macOS 13 or newer.
- Codex desktop installed as `/Applications/ChatGPT.app`.
- A Codex Micro device for live-hardware verification.
- English Codex UI for the initial conversation-scrolling settings matcher.

The initial addons were validated against Codex desktop `26.715.31925` (build `5551`). Codex updates can change private UI and hardware-message behavior.

## How it works

The locally built launcher starts the unchanged Codex app with Electron debugging bound to a random `127.0.0.1` port. The sidecar discovers the primary renderer and loads only the addon folders copied into the local helper during the build.

Each `addon.json` declares its entrypoint and allowed host actions. The sidecar rejects undeclared host requests. The only current host action is `focus-codex-window`, which asks macOS Launch Services to open the official `com.openai.codex` bundle and accepts no user content.

See [Security](SECURITY.md) and [Architecture](docs/ARCHITECTURE.md).

## Check the repository

```sh
./scripts/check.sh
```

Checks cover JavaScript and shell syntax, addon manifests, one-at-a-time addon composition, combined composition, source-asset boundaries, and the generated helper's code signature. Physical-device behavior remains a separate test.

## Status

- Unsupported runtime addons, not official OpenAI plugins or Codex features.
- Source only; no launcher binaries are attached to GitHub Releases.
- macOS only.
- No OpenAI application, icon, firmware, authentication state, or conversation data is included.

## License and trademarks

The addon source is licensed under the [MIT License](LICENSE). Codex, ChatGPT, OpenAI, Work Louder, and Codex Micro are trademarks of their respective owners. This project is not affiliated with, endorsed by, or sponsored by OpenAI or Work Louder.
