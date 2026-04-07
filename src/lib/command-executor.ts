import { db } from "@/db";
import {
  endpointServerAccess,
  serverCommandRules,
  commandHistory,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { connectionManager, type CommandResult } from "./connection-manager";
import { generateId } from "./crypto";

function matchesPattern(command: string, pattern: string): boolean {
  // Simple glob matching: * matches any characters
  const regex = new RegExp(
    "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"
  );
  return regex.test(command);
}

export async function executeCommand(
  endpointId: string,
  serverId: string,
  command: string,
  timeoutMs = 30000
): Promise<CommandResult & { commandId: string }> {
  // 1. Verify endpoint has access to this server
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
    throw new Error("This endpoint does not have access to the specified server");
  }

  const abilities = access.abilities as {
    executeCommand: boolean;
    readOutput: boolean;
    serverInfo: boolean;
    disconnect: boolean;
  };

  if (!abilities.executeCommand) {
    throw new Error("This endpoint does not have execute_command permission for this server");
  }

  // 2. Check command rules
  const rules = db
    .select()
    .from(serverCommandRules)
    .where(eq(serverCommandRules.serverId, serverId))
    .all();

  const whitelistRules = rules.filter((r) => r.ruleType === "whitelist");
  const blacklistRules = rules.filter((r) => r.ruleType === "blacklist");

  // If there are whitelist rules, command must match at least one
  if (whitelistRules.length > 0) {
    const matches = whitelistRules.some((r) => matchesPattern(command, r.pattern));
    if (!matches) {
      throw new Error("Command is not in the whitelist for this server");
    }
  }

  // Command must not match any blacklist rule
  for (const rule of blacklistRules) {
    if (matchesPattern(command, rule.pattern)) {
      throw new Error(`Command is blocked by blacklist rule: ${rule.pattern}`);
    }
  }

  // 3. Check server is online
  if (!connectionManager.isOnline(serverId)) {
    throw new Error("Server is not connected");
  }

  // 4. Execute
  const commandId = generateId();

  db.insert(commandHistory)
    .values({
      id: commandId,
      serverId,
      endpointId,
      command,
      output: null,
      status: "running",
      createdAt: new Date(),
      completedAt: null,
    })
    .run();

  try {
    const result = await connectionManager.sendCommand(
      serverId,
      commandId,
      command,
      timeoutMs
    );

    db.update(commandHistory)
      .set({
        output: result.output,
        status: result.status,
        completedAt: new Date(),
      })
      .where(eq(commandHistory.id, commandId))
      .run();

    return { ...result, commandId };
  } catch (err) {
    db.update(commandHistory)
      .set({
        output: (err as Error).message,
        status: "failed",
        completedAt: new Date(),
      })
      .where(eq(commandHistory.id, commandId))
      .run();

    throw err;
  }
}
