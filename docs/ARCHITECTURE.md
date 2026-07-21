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
  -> native macOS applet wrapper for indexing and Finder visibility
  -> finds already-running unchanged /Applications/ChatGPT.app
  -> briefly opens its Node inspector on 127.0.0.1:9229
  -> injector.mjs loads installed addon entrypoints into that process
  -> closes the inspector and exits; addons remain active in Codex
```

## Addon contract

Each `addons/<addon-id>/` folder contains:

- `addon.json`: id, name, version, description, entrypoint, tested Codex builds, and explicit `hostActions`.
- `injected.js`: self-contained renderer code with disposal and duplicate-load protection.
- `README.md`: behavior, installation id, scope, and addon-specific limitations.

`scripts/build.sh` requires one or more explicit addon ids, validates their manifests, replaces addon id/version template tokens, and copies only those folders into the generated helper. No-argument builds fail with the catalog instead of assuming all addons.

## Launcher and injector

The build compiles `app/launcher.applescript` locally into a native universal macOS applet. That gives Finder, Spotlight, and Launch Services a normal application executable without placing a binary in the repository. The applet starts `app/launcher.zsh`, which requires and resolves the exact already-running main process for `/Applications/ChatGPT.app`. It refuses to proceed if TCP port 9229 already has any listener, pre-starts the polling injector, then sends the ready Electron process `SIGUSR1` to open Node's localhost inspector without terminating or relaunching Codex.

`src/injector.mjs` connects to the Electron main process, validates its PID, and uses Electron's `webContents.debugger` API to evaluate the selected sources only in non-overlay `app://-/` renderers. It waits up to ten seconds for the first eligible renderer during a cold launch. It snapshots existing window-message listeners through the DevTools command-line API and re-registers them through the conversation addon's gate; no renderer reload is required. A renderer registry disposes addons omitted from a later installation. Main-process listeners reinject the selected addons after a renderer reload or into a later Codex window. The external injector closes and verifies the localhost inspector in a guaranteed cleanup path before exiting.

For host actions, the renderer emits a fixed-prefix console message containing an addon id and action. The in-process main listener requires both values to match the installed addon's manifest allowlist. The current `focus-codex-window` implementation activates the exact running PID through AppKit, then resolves and focuses the Electron `BrowserWindow` that emitted the request.

## Conversation scrolling

`addons/conversation-scroll/injected.js` adds a third option to the native knob menu. It installs a document-start message gate so that, while selected, only encoder-turn messages (`act: 2`, `ENC_CW`, `ENC_CC`) are withheld from native listeners. Each turn immediately scrolls the highest-scoring conversation viewport by about 20 percent of its height. Encoder press and release events remain native.

## Focus thread window

`addons/focus-thread-window/injected.js` observes without stopping propagation. A press must have `act: 1`, a non-null mapped slot, and a non-null thread key. After Codex processes the native message, the addon requests the allowlisted focus action. Command buttons and unmapped keys do nothing.

## Compatibility strategy

The project does not patch `app.asar` or import private application modules. That preserves the official app signature but means DOM integration and host-message shapes can change. Compatibility pull requests should name the exact desktop version/build and distinguish synthetic evidence from physical Codex Micro evidence.
