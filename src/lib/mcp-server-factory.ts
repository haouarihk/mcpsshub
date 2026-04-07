import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/db";
import {
  servers,
  endpointServerAccess,
  commandHistory,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { connectionManager } from "./connection-manager";
import { executeCommand } from "./command-executor";

export function createMcpServer(endpointId: string): McpServer {
  const mcp = new McpServer({
    name: "RemoteClaw",
    version: "0.1.0",
  });

  mcp.tool(
    "list_servers",
    "List all servers accessible from this endpoint",
    {},
    async () => {
      const accessList = db
        .select()
        .from(endpointServerAccess)
        .where(eq(endpointServerAccess.endpointId, endpointId))
        .all();

      const serverList = accessList.map((a) => {
        const server = db
          .select()
          .from(servers)
          .where(eq(servers.id, a.serverId))
          .get();

        if (!server) return null;

        return {
          id: server.id,
          name: server.name,
          hostname: server.hostname,
          ip: server.ip,
          os: server.os,
          status: connectionManager.isOnline(server.id) ? "online" : "offline",
          abilities: a.abilities,
        };
      }).filter(Boolean);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(serverList, null, 2),
          },
        ],
      };
    }
  );

  mcp.tool(
    "server_info",
    "Get detailed info about a specific server",
    { serverId: z.string().describe("The server ID") },
    async ({ serverId }) => {
      // Verify access
      const access = db
        .select()
        .from(endpointServerAccess)
        .where(
          and(
            eq(endpointServerAccess.endpointId, endpointId),
            eq(endpointServerAccess.serverId, serverId)
          )
        )
        .get();

      if (!access) {
        return {
          content: [{ type: "text" as const, text: "Access denied: this endpoint cannot access the specified server" }],
          isError: true,
        };
      }

      const server = db
        .select()
        .from(servers)
        .where(eq(servers.id, serverId))
        .get();

      if (!server) {
        return {
          content: [{ type: "text" as const, text: "Server not found" }],
          isError: true,
        };
      }

      const conn = connectionManager.getConnection(serverId);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                id: server.id,
                name: server.name,
                hostname: server.hostname,
                ip: server.ip,
                os: server.os,
                status: conn ? "online" : "offline",
                lastSeen: server.lastSeen,
                systemInfo: conn?.info || null,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  mcp.tool(
    "execute_command",
    "Execute a shell command on a remote server",
    {
      serverId: z.string().describe("The server ID to run the command on"),
      command: z.string().describe("The shell command to execute"),
      timeout: z
        .number()
        .optional()
        .default(30000)
        .describe("Timeout in milliseconds (default 30000)"),
    },
    async ({ serverId, command, timeout }) => {
      try {
        const result = await executeCommand(
          endpointId,
          serverId,
          command,
          timeout
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  commandId: result.commandId,
                  exitCode: result.exitCode,
                  status: result.status,
                  output: result.output,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  mcp.tool(
    "read_output",
    "Read the output of a previously executed command",
    {
      commandId: z.string().describe("The command ID to read output for"),
    },
    async ({ commandId }) => {
      const record = db
        .select()
        .from(commandHistory)
        .where(eq(commandHistory.id, commandId))
        .get();

      if (!record) {
        return {
          content: [{ type: "text" as const, text: "Command not found" }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                commandId: record.id,
                command: record.command,
                status: record.status,
                output: record.output,
                createdAt: record.createdAt,
                completedAt: record.completedAt,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  mcp.tool(
    "disconnect_server",
    "Disconnect a server's agent",
    {
      serverId: z.string().describe("The server ID to disconnect"),
    },
    async ({ serverId }) => {
      // Verify access
      const access = db
        .select()
        .from(endpointServerAccess)
        .where(
          and(
            eq(endpointServerAccess.endpointId, endpointId),
            eq(endpointServerAccess.serverId, serverId)
          )
        )
        .get();

      if (!access) {
        return {
          content: [{ type: "text" as const, text: "Access denied" }],
          isError: true,
        };
      }

      const abilities = access.abilities as {
        executeCommand: boolean;
        readOutput: boolean;
        serverInfo: boolean;
        disconnect: boolean;
      };

      if (!abilities.disconnect) {
        return {
          content: [
            { type: "text" as const, text: "This endpoint does not have disconnect permission" },
          ],
          isError: true,
        };
      }

      const conn = connectionManager.getConnection(serverId);
      if (!conn) {
        return {
          content: [{ type: "text" as const, text: "Server is not connected" }],
          isError: true,
        };
      }

      conn.ws.close();
      connectionManager.removeConnection(serverId);

      return {
        content: [{ type: "text" as const, text: "Server disconnected successfully" }],
      };
    }
  );

  return mcp;
}
