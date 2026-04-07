import http from "node:http";
import next from "next";
import express from "express";
import { WebSocketServer } from "ws";
import { db } from "./src/db/index.js";
import { servers, settings } from "./src/db/schema.js";
import { eq } from "drizzle-orm";
import { handleAgentConnection } from "./src/lib/ws-handler.js";
import { setupMcpRoutes } from "./src/lib/mcp-handler.js";
import { generateToken } from "./src/lib/crypto.js";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const expressApp = express();

  // Initialize admin token on first boot
  const existingToken = db
    .select()
    .from(settings)
    .where(eq(settings.key, "admin_token"))
    .get();

  if (!existingToken) {
    const token = process.env.ADMIN_TOKEN || generateToken(32);
    db.insert(settings).values({ key: "admin_token", value: token }).run();
    console.log(`\n  Admin token (save this): ${token}\n`);
  }

  // MCP routes
  setupMcpRoutes(expressApp);

  // Next.js handles everything else
  expressApp.all("*", (req, res) => {
    return handle(req, res);
  });

  const server = http.createServer(expressApp);

  // WebSocket server for agents
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);

    if (url.pathname === "/ws/agent") {
      const token = url.searchParams.get("token");
      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      // Look up server by agent token
      const serverRecord = db
        .select()
        .from(servers)
        .where(eq(servers.agentToken, token))
        .get();

      if (!serverRecord) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        handleAgentConnection(ws, serverRecord.id);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(port, () => {
    console.log(`  RemoteClaw running at http://localhost:${port}`);
  });
});
