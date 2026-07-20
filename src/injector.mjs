import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const port = Number(args.get("--port"));
const chatgptPid = Number(args.get("--pid"));
if (!Number.isInteger(port) || !Number.isInteger(chatgptPid)) {
  process.exit(2);
}

const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "injected.js");
const injectedSource = fs.readFileSync(scriptPath, "utf8");
const attachedTargets = new Map();
let consecutiveConnectionFailures = 0;

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
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
