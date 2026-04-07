export function generateAgentScript(
  agentToken: string,
  hostUrl: string
): string {
  const wsUrl = hostUrl
    .replace(/^http:/, "ws:")
    .replace(/^https:/, "wss:");

  return `#!/usr/bin/env bash
set -euo pipefail

# RemoteClaw Agent Script
# Connects this server to RemoteClaw via WebSocket

REMOTECLAW_TOKEN="${agentToken}"
REMOTECLAW_WS="${wsUrl}/ws/agent?token=\${REMOTECLAW_TOKEN}"

check_node() {
  if command -v node &>/dev/null; then
    NODE_BIN="node"
    return 0
  fi
  return 1
}

install_node() {
  echo "[remoteclaw] Node.js not found, installing..."
  if command -v apt-get &>/dev/null; then
    sudo apt-get update -qq && sudo apt-get install -y -qq nodejs npm
  elif command -v yum &>/dev/null; then
    sudo yum install -y nodejs npm
  elif command -v apk &>/dev/null; then
    apk add --no-cache nodejs npm
  elif command -v brew &>/dev/null; then
    brew install node
  else
    echo "[remoteclaw] ERROR: Cannot install Node.js automatically."
    echo "[remoteclaw] Please install Node.js and run this script again."
    exit 1
  fi
  NODE_BIN="node"
}

if ! check_node; then
  install_node
fi

# Check for ws package, install if missing
if ! $NODE_BIN -e "require('ws')" 2>/dev/null; then
  echo "[remoteclaw] Installing ws package..."
  AGENT_DIR="\${HOME}/.remoteclaw"
  mkdir -p "\${AGENT_DIR}"
  cd "\${AGENT_DIR}"
  npm init -y --silent 2>/dev/null
  npm install ws --silent 2>/dev/null
  cd - >/dev/null
  NODE_PATH="\${AGENT_DIR}/node_modules"
  export NODE_PATH
fi

echo "[remoteclaw] Starting agent..."

$NODE_BIN -e '
const WebSocket = require("ws");
const os = require("os");
const { execSync, spawn } = require("child_process");

const WS_URL = process.argv[1];
let reconnectDelay = 1000;
let ws;

function getIP() {
  try {
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) return iface.address;
      }
    }
  } catch {}
  return "unknown";
}

function connect() {
  ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log("[remoteclaw] Connected to server");
    reconnectDelay = 1000;

    ws.send(JSON.stringify({
      type: "system_info",
      data: {
        hostname: os.hostname(),
        ip: getIP(),
        os: os.platform() + " " + os.release(),
        arch: os.arch(),
        uptime: os.uptime(),
      }
    }));
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "command_request" && msg.commandId && msg.data) {
        const { command, timeout = 30000 } = msg.data;
        console.log("[remoteclaw] Executing:", command);

        try {
          const output = execSync(command, {
            encoding: "utf8",
            timeout,
            maxBuffer: 10 * 1024 * 1024,
            shell: "/bin/bash",
          });

          ws.send(JSON.stringify({
            type: "command_output",
            commandId: msg.commandId,
            data: { output, exitCode: 0 }
          }));
        } catch (err) {
          ws.send(JSON.stringify({
            type: "command_output",
            commandId: msg.commandId,
            data: {
              output: (err.stdout || "") + (err.stderr || err.message || ""),
              exitCode: err.status || 1
            }
          }));
        }
      } else if (msg.type === "heartbeat") {
        ws.send(JSON.stringify({ type: "heartbeat" }));
      }
    } catch (e) {
      console.error("[remoteclaw] Parse error:", e.message);
    }
  });

  ws.on("close", () => {
    console.log("[remoteclaw] Disconnected. Reconnecting in " + (reconnectDelay / 1000) + "s...");
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 30000);
  });

  ws.on("error", (err) => {
    console.error("[remoteclaw] Error:", err.message);
  });
}

connect();

process.on("SIGINT", () => {
  console.log("[remoteclaw] Shutting down...");
  if (ws) ws.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  if (ws) ws.close();
  process.exit(0);
});
' "\${REMOTECLAW_WS}"
`;
}
