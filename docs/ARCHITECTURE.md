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
  -> launches unchanged /Applications/ChatGPT.app
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

`app/launcher.zsh` finds the official app and its bundled Node.js runtime. It asks before relaunching an already-running Codex process, selects an unused localhost port, and starts Codex plus `src/injector.mjs`.

The sidecar discovers only the primary `app://-/` renderer. It registers the selected sources for future document loads and evaluates them in the current document.

For host actions, the sidecar exposes one CDP binding. Requests are JSON objects containing an addon id and action. Both must match the installed addon's manifest allowlist. The current fixed `focus-codex-window` implementation runs `/usr/bin/open -b com.openai.codex` without interpolating addon input into the command.

## Conversation scrolling

`addons/conversation-scroll/injected.js` adds a third option to the native knob menu. While selected, it intercepts only encoder-turn messages (`act: 2`, `ENC_CW`, `ENC_CC`) and scrolls the highest-scoring conversation viewport. Encoder press and release events remain native.

## Focus thread window

`addons/focus-thread-window/injected.js` observes without stopping propagation. A press must have `act: 1`, a non-null mapped slot, and a non-null thread key. After Codex processes the native message, the addon requests the allowlisted focus action. Command buttons and unmapped keys do nothing.

## Compatibility strategy

The project does not patch `app.asar` or import private application modules. That preserves the official app signature but means DOM integration and host-message shapes can change. Compatibility pull requests should name the exact desktop version/build and distinguish synthetic evidence from physical Codex Micro evidence.
