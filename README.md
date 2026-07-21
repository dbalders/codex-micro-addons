# Codex Micro Addons

Optional, source-only add-ons for Codex Micro on macOS. The installer builds a small local helper containing only the add-ons you select. It does not modify, replace, re-sign, quit, or relaunch `/Applications/ChatGPT.app`.

This is an experimental, unsupported project. It is not an official OpenAI plugin or Codex feature.

## Available add-ons

| Add-on | Version | What it does |
| --- | --- | --- |
| [`conversation-scroll`](addons/conversation-scroll) | 0.2.7 | Turns the knob clockwise to scroll down and counter-clockwise to scroll up in the active conversation. |
| [`focus-thread-window`](addons/focus-thread-window) | 0.1.3 | Brings Codex to the foreground when one of the six mapped thread buttons opens a task. |

List the catalog locally:

```sh
./scripts/list-addons.sh
```

## Security warning

The helper briefly opens the running Codex process's unauthenticated Node inspector on `127.0.0.1:9229`. It refuses to continue if that port is already in use, verifies the target process, and closes the inspector after injection. However, another process running as the same macOS user could race the helper and connect while the inspector is open.

Only use this project on a Mac where you trust the other software running under your account. Read [SECURITY.md](SECURITY.md) before installing it.

## Install

Clone the public repository and choose the add-ons you want:

```sh
git clone https://github.com/dbalders/codex-micro-addons.git
cd codex-micro-addons
./scripts/install.sh conversation-scroll focus-thread-window
```

By default, this builds and installs:

```text
~/Applications/Codex Micro Addons.app
```

To put it in the system Applications folder instead:

```sh
CODEX_MICRO_ADDONS_INSTALL_DIR=/Applications ./scripts/install.sh conversation-scroll focus-thread-window
```

Install only one add-on by passing only its folder id:

```sh
./scripts/install.sh conversation-scroll
```

The installer never assumes you want every add-on. Running it without any add-on ids prints the catalog and exits. No prebuilt application or launcher binary is downloaded; the helper is compiled and ad-hoc signed on your Mac.

## Run it

1. Open Codex normally and wait until its window is fully loaded.
2. Open **Codex Micro Addons** once. The helper injects the selected add-ons into the already-running Codex process and then exits.
3. Keep Codex running and use the configured Codex Micro controls normally.

If Finder does not show the helper, launch the default installation from Terminal:

```sh
open "$HOME/Applications/Codex Micro Addons.app"
```

If you installed it in the system Applications folder, use:

```sh
open "/Applications/Codex Micro Addons.app"
```

Run the helper again after Codex quits, restarts, or installs an update. Codex must be open before you run it.

### Conversation scrolling

Open **Settings > Codex Micro > Knob** and select **Conversation scrolling**. Turn the knob clockwise to scroll down and counter-clockwise to scroll up. Selecting one of the native knob modes restores Codex's native handling.

### Focus the task window

Leave Codex behind another app, then press one of the six mapped Codex Micro task buttons. Codex should open that task and become the focused macOS window.

## Update or change add-ons

Pull the latest source and run the installer again with the exact add-ons you want:

```sh
git pull
./scripts/install.sh conversation-scroll focus-thread-window
```

Use `CODEX_MICRO_ADDONS_INSTALL_DIR=/Applications` again if that is where you installed the helper.

## Give it to an agent

The repository-level [`AGENTS.md`](AGENTS.md) tells an agent how to inspect the catalog, ask which add-ons the user wants, install only those folders, and report synthetic and physical-hardware results separately.

Example request:

> Clone `https://github.com/dbalders/codex-micro-addons`, read `AGENTS.md`, show me the available add-ons, and install `conversation-scroll` and `focus-thread-window` after checking the source.

## Requirements and compatibility

- macOS 13 or newer.
- Codex desktop installed as `/Applications/ChatGPT.app`.
- Codex already running with a fully loaded window before injection.
- A Codex Micro device for physical-hardware verification.
- English Codex UI for the conversation-scrolling settings matcher.

The add-ons were physically tested with Codex desktop `26.715.31925` (build `5551`) and `26.715.61943` (build `5628`). Codex updates can change the private UI and hardware-message behavior, so re-testing is required after an update.

## How it works

The launcher starts the local injector, signals the existing Codex process with Node's non-terminating `SIGUSR1` signal, and attaches to the Electron main process through the inspector on port 9229. The injector verifies the Codex process id and loads only the add-on folders copied into the helper during installation. It then closes and verifies the inspector endpoint. Lightweight listeners inside the existing Codex process keep the selected add-ons active until Codex exits.

Each `addon.json` declares its entrypoint and allowed host actions. The injector rejects undeclared host requests. The current `focus-codex-window` action activates the exact running Codex process through AppKit and focuses the Electron window that emitted the allowlisted request. It does not accept conversation or other user content.

See [SECURITY.md](SECURITY.md) and [Architecture](docs/ARCHITECTURE.md) for details.

## Check the repository

```sh
./scripts/check.sh
```

The checks cover JavaScript and shell syntax, add-on manifests, individual and combined helper composition, source-asset boundaries, and the generated helper's code signature. Physical-device behavior remains a separate test.

## Project status

- Helper version: `0.2.6`.
- Source only; no launcher binaries are attached to GitHub Releases.
- macOS only.
- No OpenAI application, icon, firmware, authentication state, or conversation data is included.

## License and trademarks

The add-on source is licensed under the [MIT License](LICENSE). Codex, ChatGPT, OpenAI, Work Louder, and Codex Micro are trademarks of their respective owners. This project is not affiliated with, endorsed by, or sponsored by OpenAI or Work Louder.
