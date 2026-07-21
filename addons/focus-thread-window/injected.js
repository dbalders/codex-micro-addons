(() => {
  "use strict";

  const ADDON_ID = "__ADDON_ID__";
  const VERSION = "__ADDON_VERSION__";
  const registry = globalThis.__codexMicroAddonsRegistry instanceof Map
    ? globalThis.__codexMicroAddonsRegistry
    : (globalThis.__codexMicroAddonsRegistry = new Map());
  const HOST_BINDING = "codexMicroAddonsHost";

  if (globalThis.__codexMicroAddonsFocusThreadWindow?.version === VERSION) {
    registry.set(ADDON_ID, globalThis.__codexMicroAddonsFocusThreadWindow);
    return;
  }
  globalThis.__codexMicroAddonsFocusThreadWindow?.dispose?.();

  let focusTimer = null;

  function requestCodexFocus() {
    const binding = globalThis[HOST_BINDING];
    if (typeof binding === "function") {
      binding(JSON.stringify({ addonId: ADDON_ID, action: "focus-codex-window" }));
    } else {
      window.focus();
    }
    globalThis.__codexMicroAddonsFocusThreadWindow.lastFocusRequestAt = Date.now();
  }

  function handleMicroMessage(event) {
    const payload = event.data;
    const input = payload?.type === "codex-micro-hid-event" ? payload.event : null;
    const opensMappedThread = input?.act === 1 && input.slot != null && input.threadKey != null;
    if (!opensMappedThread) return;

    if (focusTimer) clearTimeout(focusTimer);
    focusTimer = setTimeout(() => {
      focusTimer = null;
      requestCodexFocus();
    }, 80);
  }

  window.addEventListener("message", handleMicroMessage, true);

  const addonState = {
    version: VERSION,
    lastFocusRequestAt: null,
    dispose() {
      window.removeEventListener("message", handleMicroMessage, true);
      if (focusTimer) clearTimeout(focusTimer);
      if (registry.get(ADDON_ID) === addonState) registry.delete(ADDON_ID);
      if (globalThis.__codexMicroAddonsFocusThreadWindow === addonState) {
        delete globalThis.__codexMicroAddonsFocusThreadWindow;
      }
    },
  };
  globalThis.__codexMicroAddonsFocusThreadWindow = addonState;
  registry.set(ADDON_ID, addonState);
})();
