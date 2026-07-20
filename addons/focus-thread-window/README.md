# Focus thread window

Brings Codex to the foreground when a Codex Micro agent/thread key opens its mapped thread.

- It observes only button-press events that contain both a mapped slot and thread key.
- It does not stop or replace Codex's native thread-opening behavior.
- Command buttons, unmapped keys, the joystick, and the knob are ignored.
- The host action is restricted to opening the official `com.openai.codex` bundle through macOS Launch Services.

Install only this addon:

```sh
./scripts/install.sh focus-thread-window
```

Install it together with conversation scrolling:

```sh
./scripts/install.sh conversation-scroll focus-thread-window
```
