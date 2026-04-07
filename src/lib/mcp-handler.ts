import type { Express } from "express";
import { randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { db } from "@/db";
import { mcpEndpoints } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createMcpServer } from "./mcp-server-factory";

interface SessionEntry {
  transport: StreamableHTTPServerTransport;
  endpointId: string;
  createdAt: number;
}

const sessions = new Map<string, SessionEntry>();

// Clean up stale sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > 30 * 60 * 1000) {
      session.transport.close();
      sessions.delete(id);
    }
  }
}, 10 * 60 * 1000);

function isInitializeRequest(body: unknown): boolean {
  if (Array.isArray(body)) {
    return body.some(
      (msg) => typeof msg === "object" && msg !== null && msg.method === "initialize"
    );
  }
  return (
    typeof body === "object" &&
    body !== null &&
    (body as Record<string, unknown>).method === "initialize"
  );
}

export function setupMcpRoutes(app: Express) {
  // Parse JSON for MCP routes
  app.use("/mcp/:urlToken", (req, res, next) => {
    if (req.headers["content-type"]?.includes("application/json")) {
      let data = "";
      req.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      req.on("end", () => {
        try {
          (req as unknown as Record<string, unknown>).body = JSON.parse(data);
        } catch {
          (req as unknown as Record<string, unknown>).body = undefined;
        }
        next();
      });
    } else {
      next();
    }
  });

  // POST - handle MCP messages
  app.post("/mcp/:urlToken", async (req, res) => {
    const { urlToken } = req.params;

    const endpoint = db
      .select()
      .from(mcpEndpoints)
      .where(eq(mcpEndpoints.urlToken, urlToken))
      .get();

    if (!endpoint || !endpoint.enabled) {
      res.status(404).json({ error: "Endpoint not found" });
      return;
    }

    const body = (req as unknown as Record<string, unknown>).body;
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    // If this is an initialize request, create a new session
    if (isInitializeRequest(body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      const mcpServer = createMcpServer(endpoint.id);
      await mcpServer.connect(transport);

      // We need to handle the request to get the session ID
      await transport.handleRequest(req, res, body);

      // Store session after handling (session ID is set during handleRequest)
      if (transport.sessionId) {
        sessions.set(transport.sessionId, {
          transport,
          endpointId: endpoint.id,
          createdAt: Date.now(),
        });
      }
      return;
    }

    // For non-initialize requests, look up existing session
    if (!sessionId) {
      res.status(400).json({ error: "Missing mcp-session-id header" });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    await session.transport.handleRequest(req, res, body);
  });

  // GET - SSE stream for server-initiated messages
  app.get("/mcp/:urlToken", async (req, res) => {
    const { urlToken } = req.params;

    const endpoint = db
      .select()
      .from(mcpEndpoints)
      .where(eq(mcpEndpoints.urlToken, urlToken))
      .get();

    if (!endpoint || !endpoint.enabled) {
      res.status(404).json({ error: "Endpoint not found" });
      return;
    }

    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId) {
      res.status(400).json({ error: "Missing mcp-session-id header" });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    await session.transport.handleRequest(req, res);
  });

  // DELETE - terminate session
  app.delete("/mcp/:urlToken", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.handleRequest(req, res);
      sessions.delete(sessionId);
    } else {
      res.status(404).json({ error: "Session not found" });
    }
  });
}
