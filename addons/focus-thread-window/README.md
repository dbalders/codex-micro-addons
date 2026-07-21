# Focus thread window

Brings Codex to the foreground when a Codex Micro agent/thread key opens its mapped thread.

- It observes only button-press events that contain both a mapped slot and thread key.
- It does not stop or replace Codex's native thread-opening behavior.
- Command buttons, unmapped keys, the joystick, and the knob are ignored.
- The host action is restricted to activating the exact running Codex process and focusing the Electron window that emitted the request.

Install only this addon:

```sh
./scripts/install.sh focus-thread-window
```

Install it together with conversation scrolling:

```sh
./scripts/install.sh conversation-scroll focus-thread-window
```
