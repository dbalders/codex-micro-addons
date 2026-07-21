import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST_BINDING = "codexMicroAddonsHost";
const HOST_MESSAGE_PREFIX = "__CODEX_MICRO_ADDONS_HOST__";
const STATE_SYMBOL = "codex-micro-addons.main-state";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const port = Number(args.get("--port") ?? 9229);
const chatgptPid = Number(args.get("--pid"));
const closeOnly = args.get("--mode") === "close-only";
if (!Number.isInteger(port) || !Number.isInteger(chatgptPid)) process.exit(2);

const resourcesDir = path.dirname(fileURLToPath(import.meta.url));
const installedAddons = loadInstalledAddons(path.join(resourcesDir, "addons"));
if (installedAddons.length === 0) process.exit(2);

const injectedSource = installedAddons
  .map(({ id, main, source }) => `${source}\n//# sourceURL=codex-micro-addon://${id}/${main}`)
  .join("\n");
const initialInjectedSource = `(() => {
  const selectedAddonIds = new Set(${JSON.stringify(installedAddons.map((addon) => addon.id))});
  const addonRegistry = globalThis.__codexMicroAddonsRegistry instanceof Map
    ? globalThis.__codexMicroAddonsRegistry
    : (globalThis.__codexMicroAddonsRegistry = new Map());
  for (const [addonId, addon] of [...addonRegistry]) {
    if (selectedAddonIds.has(addonId)) continue;
    try {
      addon?.dispose?.({ clearPreference: true });
    } finally {
      addonRegistry.delete(addonId);
    }
  }
  const messageGateAlreadyInstalled = Boolean(
    globalThis.__codexMicroAddonsConversationScrollMessageGate,
  );
  const existingMessageListeners = !messageGateAlreadyInstalled && typeof getEventListeners === "function"
    ? (getEventListeners(window).message ?? [])
    : [];
  globalThis[${JSON.stringify(HOST_BINDING)}] = (payload) => {
    console.info(${JSON.stringify(HOST_MESSAGE_PREFIX)} + String(payload));
  };
  ${injectedSource}
  if (messageGateAlreadyInstalled) return;
  const messageGate = globalThis.__codexMicroAddonsConversationScrollMessageGate;
  if (!messageGate) return;
  for (const entry of existingMessageListeners) {
    messageGate.remove("message", entry.listener, entry.useCapture);
    window.addEventListener("message", entry.listener, {
      capture: entry.useCapture,
      passive: entry.passive,
      once: entry.once,
    });
  }
})()`;

const allowedHostActions = Object.fromEntries(
  installedAddons.map((addon) => [addon.id, addon.hostActions]),
);
const installPayload = {
  expectedPid: chatgptPid,
  initialInjectedSource,
  allowedHostActions,
  hostMessagePrefix: HOST_MESSAGE_PREFIX,
  stateSymbol: STATE_SYMBOL,
};

function loadInstalledAddons(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => {
      const addonDir = path.join(directory, entry.name);
      const manifest = JSON.parse(fs.readFileSync(path.join(addonDir, "addon.json"), "utf8"));
      if (manifest.id !== entry.name || !/^[a-z0-9-]+$/.test(manifest.id)) {
        throw new Error(`Invalid addon id: ${entry.name}`);
      }
      if (path.basename(manifest.main) !== manifest.main) {
        throw new Error(`Invalid addon entrypoint: ${manifest.id}`);
      }
      return {
        id: manifest.id,
        main: manifest.main,
        hostActions: Array.isArray(manifest.hostActions) ? manifest.hostActions : [],
        source: fs.readFileSync(path.join(addonDir, manifest.main), "utf8"),
      };
    });
}

function installExpression(payload) {
  return `(async () => {
    const config = ${JSON.stringify(payload)};
    if (process.pid !== config.expectedPid) {
      throw new Error("Inspector PID does not match the running Codex process");
    }

    const createRequire = process.getBuiltinModule("module").createRequire;
    const require = createRequire(process.execPath);
    const { execFile } = require("node:child_process");
    const electron = require("electron");
    const stateKey = Symbol.for(config.stateSymbol);
    globalThis[stateKey]?.dispose?.();

    const state = {
      allowedHostActions: new Map(
        Object.entries(config.allowedHostActions).map(([id, actions]) => [id, new Set(actions)]),
      ),
      disposed: false,
      inflight: new Map(),
      lastFocusAt: 0,
      lastFocusResult: null,
      tracked: new Map(),
    };
    globalThis[stateKey] = state;

    function isCodexPage(contents) {
      if (contents.isDestroyed()) return false;
      const url = contents.getURL();
      return url.startsWith("app://-/") && !url.includes("avatar-overlay");
    }

    async function inject(contents) {
      if (state.disposed || !isCodexPage(contents)) return null;
      if (state.inflight.has(contents.id)) return state.inflight.get(contents.id);

      const pending = (async () => {
        const devtools = contents.debugger;
        const attachedHere = !devtools.isAttached();
        try {
          if (attachedHere) devtools.attach("1.3");
          const evaluation = await devtools.sendCommand("Runtime.evaluate", {
            expression: config.initialInjectedSource,
            includeCommandLineAPI: true,
            returnByValue: true,
          });
          if (evaluation.exceptionDetails) {
            throw new Error(evaluation.exceptionDetails.text ?? "Renderer injection failed");
          }
          return { id: contents.id, url: contents.getURL() };
        } finally {
          if (attachedHere && devtools.isAttached()) devtools.detach();
        }
      })();

      state.inflight.set(contents.id, pending);
      try {
        return await pending;
      } finally {
        state.inflight.delete(contents.id);
      }
    }

    function focusWindow(contents) {
      const now = Date.now();
      if (now - state.lastFocusAt < 200) return;
      state.lastFocusAt = now;
      const window = electron.BrowserWindow.fromWebContents(contents);
      if (!window || window.isDestroyed()) {
        state.lastFocusResult = { at: now, error: "Codex window not found" };
        return;
      }

      const focusElectronWindow = () => {
        if (window.isDestroyed()) return;
        if (window.isMinimized()) window.restore();
        window.show();
        electron.app.focus({ steal: true });
        window.moveTop();
        window.focus();
      };
      focusElectronWindow();

      const activationScript = [
        'ObjC.import("AppKit");',
        "const app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(" + process.pid + ");",
        'if (!app) throw new Error("Codex process not found");',
        "app.activateWithOptions(",
        "  $.NSApplicationActivateAllWindows | $.NSApplicationActivateIgnoringOtherApps,",
        ");",
      ].join("\\n");
      state.lastFocusResult = { at: now, nativeActivation: "pending" };
      execFile(
        "/usr/bin/osascript",
        ["-l", "JavaScript", "-e", activationScript],
        { timeout: 3000 },
        (error) => {
          state.lastFocusResult = {
            at: now,
            nativeActivation: error ? "failed" : "complete",
            error: error?.message ?? null,
          };
          focusElectronWindow();
        },
      );
    }

    function handleConsoleMessage(contents, args) {
      if (!isCodexPage(contents)) return;
      const details = args.find(
        (value) => value && typeof value === "object" && typeof value.message === "string",
      );
      const message = details?.message ?? args.find((value, index) => index > 0 && typeof value === "string");
      if (typeof message !== "string" || !message.startsWith(config.hostMessagePrefix)) return;

      let request;
      try {
        request = JSON.parse(message.slice(config.hostMessagePrefix.length));
      } catch {
        return;
      }
      if (
        !request ||
        typeof request !== "object" ||
        typeof request.addonId !== "string" ||
        typeof request.action !== "string"
      ) return;
      if (!state.allowedHostActions.get(request.addonId)?.has(request.action)) return;
      if (request.action === "focus-codex-window") focusWindow(contents);
    }

    function untrack(contents) {
      const tracked = state.tracked.get(contents.id);
      if (!tracked) return;
      contents.removeListener("did-finish-load", tracked.onLoad);
      contents.removeListener("console-message", tracked.onConsole);
      contents.removeListener("destroyed", tracked.onDestroyed);
      state.tracked.delete(contents.id);
    }

    function track(contents) {
      if (state.disposed || contents.isDestroyed() || state.tracked.has(contents.id)) return;
      const onLoad = () => void inject(contents).catch(() => {});
      const onConsole = (...args) => handleConsoleMessage(contents, args);
      const onDestroyed = () => untrack(contents);
      contents.on("did-finish-load", onLoad);
      contents.on("console-message", onConsole);
      contents.on("destroyed", onDestroyed);
      state.tracked.set(contents.id, { contents, onLoad, onConsole, onDestroyed });
    }

    const onWebContentsCreated = (_event, contents) => {
      track(contents);
      queueMicrotask(() => void inject(contents).catch(() => {}));
    };
    electron.app.on("web-contents-created", onWebContentsCreated);

    state.dispose = () => {
      if (state.disposed) return;
      state.disposed = true;
      electron.app.removeListener("web-contents-created", onWebContentsCreated);
      for (const { contents } of [...state.tracked.values()]) untrack(contents);
    };

    let results = [];
    let injected = [];
    const injectionDeadline = Date.now() + 10000;
    do {
      const currentContents = electron.webContents.getAllWebContents();
      for (const contents of currentContents) track(contents);
      const eligibleContents = currentContents.filter((contents) => isCodexPage(contents));
      results = await Promise.allSettled(eligibleContents.map((contents) => inject(contents)));
      injected = results
        .filter((result) => result.status === "fulfilled" && result.value)
        .map((result) => result.value);
      const failed = results.filter((result) => result.status === "rejected").length;
      if (eligibleContents.length > 0 && failed === 0 && injected.length === eligibleContents.length) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    } while (Date.now() < injectionDeadline);

    return {
      pid: process.pid,
      injected,
      failed: results.filter((result) => result.status === "rejected").length,
    };
  })()`;
}

async function inspectorWebSocketUrl() {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!response.ok) throw new Error(`Inspector returned HTTP ${response.status}`);
  const targets = await response.json();
  const target = targets.find((candidate) => candidate.type === "node" && candidate.webSocketDebuggerUrl);
  if (!target) throw new Error("Codex main-process inspector was not found");
  return target.webSocketDebuggerUrl;
}

async function waitForInspectorWebSocketUrl(timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = new Error("Codex main-process inspector did not open");
  do {
    try {
      return await inspectorWebSocketUrl();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  } while (Date.now() < deadline);
  throw lastError;
}

async function connect(url) {
  return await new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.addEventListener("open", () => resolve(socket), { once: true });
    socket.addEventListener("error", () => reject(new Error("Could not connect to Codex inspector")), {
      once: true,
    });
  });
}

function inspectorClient(socket) {
  let nextId = 1;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  socket.addEventListener("close", () => {
    for (const request of pending.values()) request.reject(new Error("Codex inspector closed"));
    pending.clear();
  });

  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
}

async function closeInspectorEndpoint(existingSocket, existingSend) {
  let socket = existingSocket;
  let send = existingSend;
  if (!socket || socket.readyState !== 1 || typeof send !== "function") {
    let url;
    try {
      url = await waitForInspectorWebSocketUrl(1000);
    } catch {
      return;
    }
    socket = await connect(url);
    send = inspectorClient(socket);
  }

  try {
    const identity = await send("Runtime.evaluate", {
      expression: "process.pid",
      returnByValue: true,
    });
    if (identity.result?.value !== chatgptPid) {
      throw new Error("Refusing to close an inspector owned by another process");
    }
    await send("Runtime.evaluate", {
      expression:
        'setTimeout(() => { try { process.getBuiltinModule("inspector").close(); } catch {} }, 50); "closing"',
      returnByValue: true,
    });
  } finally {
    socket.close();
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { cache: "no-store" });
      if (!response.ok) return;
    } catch {
      return;
    }
  }
  throw new Error("Codex inspector did not close after injection");
}

let activeSocket = null;
let activeSend = null;
let summary = null;
let operationError = null;

try {
  if (!closeOnly) {
    activeSocket = await connect(await waitForInspectorWebSocketUrl());
    activeSend = inspectorClient(activeSocket);
    const result = await activeSend("Runtime.evaluate", {
      expression: installExpression(installPayload),
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    }
    if (
      result.result?.value?.pid !== chatgptPid ||
      result.result.value.injected.length === 0 ||
      result.result.value.failed !== 0
    ) {
      throw new Error("No Codex renderer accepted the selected addons");
    }
    summary = result.result.value;
  }
} catch (error) {
  operationError = error;
}

try {
  await closeInspectorEndpoint(activeSocket, activeSend);
} catch (closeError) {
  operationError = operationError
    ? new AggregateError([operationError, closeError], "Addon injection and inspector cleanup failed")
    : closeError;
}

if (operationError) throw operationError;
if (summary) {
  console.log(`Loaded addons into Codex PID ${chatgptPid}`);
  console.log(`Renderer targets: ${summary.injected.length}`);
}
