# Architecture

```text
Codex Micro Plus.app
  -> launches the unchanged /Applications/ChatGPT.app
  -> binds Electron debugging to a random 127.0.0.1 port
  -> injector.mjs discovers the primary app:// renderer
  -> injected.js adds Conversation scrolling to the Knob menu
  -> ENC_CW scrolls the active conversation down
  -> ENC_CC scrolls the active conversation up
```

## Launcher

`app/launcher.zsh` finds the official app and its bundled Node.js runtime. If Codex is already open, it asks the user before quitting and relaunching it. It selects an unused high localhost port and starts both Codex and the sidecar.

## Sidecar

`src/injector.mjs` polls Electron's JSON target list, connects only to the main `app://-/` page, registers the runtime code for future document loads, and evaluates it in the current document. It exits after the launched Codex process and debugging endpoint are gone.

## Renderer extension

`src/injected.js` performs three scoped operations:

1. It adds **Conversation scrolling** to the existing knob menu and mirrors the selected label in the existing trigger.
2. It stores the extension mode in renderer-local storage.
3. While that mode is active, it intercepts only `act: 2` events with keys `ENC_CW` or `ENC_CC`, stops Codex's native encoder handler for those turns, and scrolls the highest-scoring conversation viewport.

Encoder press and release events are not intercepted, so the original click and long-press behavior remains available.

## Compatibility strategy

This project does not patch `app.asar` or import private application modules. That preserves the official app's signature but means the DOM integration and host-message shape can change in an app update. Compatibility changes should be tested against the exact desktop version and build listed in a pull request.
