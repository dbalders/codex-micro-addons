# Architecture

```text
addons/
  conversation-scroll/       selected independently
  focus-thread-window/       selected independently
             |
             v
scripts/build.sh <ids>        copies only selected folders
             |
             v
Codex Micro Addons.app
  -> launches unchanged /Applications/ChatGPT copy.app
  -> uses an isolated addon profile
  -> binds Electron debugging to random 127.0.0.1 port
  -> injector.mjs loads installed addon entrypoints
```

## Addon contract

Each `addons/<addon-id>/` folder contains:

- `addon.json`: id, name, version, description, entrypoint, tested Codex builds, and explicit `hostActions`.
- `injected.js`: self-contained renderer code with disposal and duplicate-load protection.
- `README.md`: behavior, installation id, scope, and addon-specific limitations.

`scripts/build.sh` requires one or more explicit addon ids, validates their manifests, replaces addon id/version template tokens, and copies only those folders into the generated helper. No-argument builds fail with the catalog instead of assuming all addons.

## Launcher and sidecar

`app/launcher.zsh` finds the pre-existing app copy and its bundled Node.js runtime, selects an unused localhost port, and starts the copy plus `src/injector.mjs`. Both `CODEX_ELECTRON_USER_DATA_PATH` and Electron's `--user-data-dir` point to an isolated addon profile, so the regular Codex process and profile are not interrupted.

The sidecar discovers only the primary `app://-/` renderer. It registers the selected sources for future document-start execution and evaluates them in the current document. For the current document, it snapshots existing window-message listeners through the CDP command-line API and re-registers them through the conversation addon's gate; no renderer reload is required.

For host actions, the sidecar exposes one CDP binding. Requests are JSON objects containing an addon id and action. Both must match the installed addon's manifest allowlist. The current `focus-codex-window` implementation asks AppKit to activate the exact process id launched by the helper, avoiding ambiguity between apps that share the same bundle identifier.

## Conversation scrolling

`addons/conversation-scroll/injected.js` adds a third option to the native knob menu. It installs a document-start message gate so that, while selected, only encoder-turn messages (`act: 2`, `ENC_CW`, `ENC_CC`) are withheld from native listeners. Each turn immediately scrolls the highest-scoring conversation viewport by about 20 percent of its height. Encoder press and release events remain native.

## Focus thread window

`addons/focus-thread-window/injected.js` observes without stopping propagation. A press must have `act: 1`, a non-null mapped slot, and a non-null thread key. After Codex processes the native message, the addon requests the allowlisted focus action. Command buttons and unmapped keys do nothing.

## Compatibility strategy

The project does not patch `app.asar` or import private application modules. That preserves the official app signature but means DOM integration and host-message shapes can change. Compatibility pull requests should name the exact desktop version/build and distinguish synthetic evidence from physical Codex Micro evidence.
