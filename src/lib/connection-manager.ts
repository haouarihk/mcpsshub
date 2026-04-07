import type { WebSocket } from "ws";

interface SystemInfo {
  hostname: string;
  ip: string;
  os: string;
  arch: string;
  uptime: number;
}

interface PendingCommand {
  resolve: (result: CommandResult) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export interface CommandResult {
  commandId: string;
  output: string;
  exitCode: number;
  status: "completed" | "failed" | "timeout";
}

interface AgentConnection {
  ws: WebSocket;
  serverId: string;
  info?: SystemInfo;
}

class ConnectionManager {
  private connections = new Map<string, AgentConnection>();
  private pendingCommands = new Map<string, PendingCommand>();

  addConnection(serverId: string, ws: WebSocket, info?: SystemInfo) {
    this.connections.set(serverId, { ws, serverId, info });
  }

  removeConnection(serverId: string) {
    const conn = this.connections.get(serverId);
    if (conn) {
      this.connections.delete(serverId);
    }
  }

  updateInfo(serverId: string, info: SystemInfo) {
    const conn = this.connections.get(serverId);
    if (conn) {
      conn.info = info;
    }
  }

  getConnection(serverId: string): AgentConnection | undefined {
    return this.connections.get(serverId);
  }

  isOnline(serverId: string): boolean {
    return this.connections.has(serverId);
  }

  getAll(): Map<string, AgentConnection> {
    return this.connections;
  }

  sendCommand(
    serverId: string,
    commandId: string,
    command: string,
    timeoutMs = 30000
  ): Promise<CommandResult> {
    const conn = this.connections.get(serverId);
    if (!conn) {
      return Promise.reject(new Error(`Server ${serverId} is not connected`));
    }

    return new Promise<CommandResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(commandId);
        resolve({
          commandId,
          output: "Command timed out",
          exitCode: -1,
          status: "timeout",
        });
      }, timeoutMs);

      this.pendingCommands.set(commandId, { resolve, reject, timeout });

      conn.ws.send(
        JSON.stringify({
          type: "command_request",
          commandId,
          data: { command, timeout: timeoutMs },
        })
      );
    });
  }

  resolveCommand(commandId: string, result: CommandResult) {
    const pending = this.pendingCommands.get(commandId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingCommands.delete(commandId);
      pending.resolve(result);
    }
  }
}

export const connectionManager = new ConnectionManager();
