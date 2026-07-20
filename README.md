# Codex Micro Plus

An unofficial macOS runtime extension that adds **Conversation scrolling** to the existing **Codex Settings > Codex Micro > Knob** menu.

- Turn clockwise to scroll down through the active conversation.
- Turn counter-clockwise to scroll up.
- Knob clicks and every other Codex Micro input retain their normal behavior.
- `ChatGPT.app` is never edited, replaced, or re-signed.

## Requirements

- macOS 13 or newer.
- The Codex desktop app installed as `/Applications/ChatGPT.app`.
- A Codex Micro device.
- English selected as the Codex interface language for this initial release.

Version `0.1.0` was validated against Codex desktop `26.715.31925` (build `5551`). Codex updates can change internal UI or hardware behavior, so compatibility with later builds is not guaranteed.

## Give it to an agent

Send an agent the repository URL and ask it to install and verify Codex Micro Plus. The repository-level [`AGENTS.md`](AGENTS.md) contains the exact safety boundary, commands, and evidence it should report.

For example:

> Clone `https://github.com/dbalders/codex-micro-plus`, read `AGENTS.md`, install it locally, run the checks, and tell me the detected Codex version and any remaining live-hardware test.

There are no release binaries to download. The launcher is built from the checked-in source on the user's own Mac.

## Install directly from source

```sh
git clone https://github.com/dbalders/codex-micro-plus.git
cd codex-micro-plus
./scripts/install.sh
```

The installer builds an ad-hoc-signed launcher and installs it to `~/Applications/Codex Micro Plus.app`. It does not modify Codex.

## Use it

1. Open **Codex Micro Plus** instead of opening ChatGPT directly.
2. If Codex is already running, approve **Quit and Relaunch**.
3. Open **Settings > Codex Micro > Knob**.
4. Select **Conversation scrolling**.

Selecting **Composer navigation** or **Reasoning only** switches back to Codex's native handling immediately.

## How it works

The launcher starts the unchanged Codex desktop app with Electron's remote-debugging interface bound to a random localhost port. A small sidecar connects to the primary renderer and loads the extension at runtime. The extension adds one menu item, stores the choice in renderer-local storage, and intercepts only encoder-turn events while that choice is active.

The debugging endpoint exists only while that Codex process is running and is bound to `127.0.0.1`. Any process running as your macOS user can generally access localhost services, so review the source before use. See [Security](SECURITY.md) and [Architecture](docs/ARCHITECTURE.md).

## Build and test

```sh
./scripts/check.sh
```

The command checks JavaScript and shell syntax, validates the plist, ensures the repository is not redistributing an OpenAI app or icon, builds the local launcher, and verifies its signature. Live hardware testing requires Codex and a connected Codex Micro.

## Status and limitations

- This is an unsupported runtime extension, not an OpenAI plugin or official Codex feature.
- The initial UI matcher supports English only.
- App updates may require selector or event-bridge changes.
- It currently supports macOS only.
- The repository does not contain or redistribute `ChatGPT.app`, OpenAI artwork, or Codex Micro firmware.
- The project intentionally publishes source only; it does not attach launcher binaries to GitHub Releases.

## License and trademarks

The extension source is licensed under the [MIT License](LICENSE). Codex, ChatGPT, OpenAI, Work Louder, and Codex Micro are trademarks of their respective owners. This project is not affiliated with, endorsed by, or sponsored by OpenAI or Work Louder.
