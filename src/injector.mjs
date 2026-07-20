import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST_BINDING = "codexMicroAddonsHost";
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const port = Number(args.get("--port"));
const chatgptPid = Number(args.get("--pid"));
if (!Number.isInteger(port) || !Number.isInteger(chatgptPid)) process.exit(2);

const resourcesDir = path.dirname(fileURLToPath(import.meta.url));
const addonsDir = path.join(resourcesDir, "addons");
const installedAddons = loadInstalledAddons(addonsDir);
if (installedAddons.length === 0) process.exit(2);

const injectedSource = installedAddons
  .map(({ id, main, source }) => `${source}\n//# sourceURL=codex-micro-addon://${id}/${main}`)
  .join("\n");
const allowedHostActions = new Map(
  installedAddons.map((addon) => [addon.id, new Set(addon.hostActions)]),
);
const attachedTargets = new Map();
let consecutiveConnectionFailures = 0;
let lastFocusAt = 0;

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

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function handleHostBinding(payload) {
  let request;
  try {
    request = JSON.parse(payload);
  } catch {
    return;
  }

  if (!allowedHostActions.get(request.addonId)?.has(request.action)) return;
  if (request.action !== "focus-codex-window") return;

  const now = Date.now();
  if (now - lastFocusAt < 200) return;
  lastFocusAt = now;
  execFile(
    "/usr/bin/open",
    ["-b", "com.openai.codex"],
    { timeout: 3000 },
    () => {},
  );
}

function connectToTarget(target) {
  if (attachedTargets.has(target.id) || !target.webSocketDebuggerUrl) return;

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  attachedTargets.set(target.id, socket);
  let nextId = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  socket.addEventListener("open", async () => {
    try {
      await send("Runtime.addBinding", { name: HOST_BINDING });
      await send("Page.addScriptToEvaluateOnNewDocument", { source: injectedSource });
      await send("Runtime.evaluate", {
        expression: injectedSource,
        includeCommandLineAPI: false,
        returnByValue: true,
      });
    } catch {
      socket.close();
    }
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.method === "Runtime.bindingCalled" && message.params?.name === HOST_BINDING) {
      handleHostBinding(message.params.payload);
      return;
    }
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });

  socket.addEventListener("close", () => {
    attachedTargets.delete(target.id);
    for (const request of pending.values()) request.reject(new Error("Codex renderer closed"));
    pending.clear();
  });

  socket.addEventListener("error", () => socket.close());
}

async function discoverTargets() {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const targets = await response.json();
    consecutiveConnectionFailures = 0;

    for (const target of targets) {
      const isMainCodexWindow =
        target.type === "page" &&
        target.url.startsWith("app://-/") &&
        !target.url.includes("avatar-overlay");
      if (isMainCodexWindow) connectToTarget(target);
    }
  } catch {
    consecutiveConnectionFailures += 1;
  }
}

for (;;) {
  await discoverTargets();
  if (!isProcessRunning(chatgptPid) && consecutiveConnectionFailures > 4) break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

for (const socket of attachedTargets.values()) socket.close();
