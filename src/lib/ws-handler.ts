import type { WebSocket } from "ws";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { connectionManager } from "./connection-manager";

interface AgentMessage {
  type: "system_info" | "command_output" | "heartbeat";
  commandId?: string;
  data?: Record<string, unknown>;
}

export function handleAgentConnection(ws: WebSocket, serverId: string) {
  console.log(`[ws] Agent connected for server ${serverId}`);

  // Mark server online
  db.update(servers)
    .set({ status: "online", lastSeen: new Date() })
    .where(eq(servers.id, serverId))
    .run();

  connectionManager.addConnection(serverId, ws);

  // Heartbeat
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: "heartbeat" }));
    }
  }, 30000);

  ws.on("message", (raw) => {
    try {
      const msg: AgentMessage = JSON.parse(raw.toString());

      switch (msg.type) {
        case "system_info": {
          const info = msg.data as {
            hostname: string;
            ip: string;
            os: string;
            arch: string;
            uptime: number;
          };
          connectionManager.updateInfo(serverId, info);
          db.update(servers)
            .set({
              hostname: info.hostname,
              ip: info.ip,
              os: info.os,
              lastSeen: new Date(),
            })
            .where(eq(servers.id, serverId))
            .run();
          break;
        }

        case "command_output": {
          if (msg.commandId && msg.data) {
            connectionManager.resolveCommand(msg.commandId, {
              commandId: msg.commandId,
              output: (msg.data.output as string) || "",
              exitCode: (msg.data.exitCode as number) ?? -1,
              status:
                (msg.data.exitCode as number) === 0 ? "completed" : "failed",
            });
          }
          break;
        }

        case "heartbeat": {
          db.update(servers)
            .set({ lastSeen: new Date() })
            .where(eq(servers.id, serverId))
            .run();
          break;
        }
      }
    } catch (e) {
      console.error("[ws] Failed to parse message:", e);
    }
  });

  ws.on("close", () => {
    console.log(`[ws] Agent disconnected for server ${serverId}`);
    clearInterval(heartbeatInterval);
    connectionManager.removeConnection(serverId);
    db.update(servers)
      .set({ status: "offline", lastSeen: new Date() })
      .where(eq(servers.id, serverId))
      .run();
  });

  ws.on("error", (err) => {
    console.error(`[ws] Agent error for server ${serverId}:`, err.message);
  });
}
