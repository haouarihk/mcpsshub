import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const servers = sqliteTable("servers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  hostname: text("hostname"),
  ip: text("ip"),
  os: text("os"),
  agentToken: text("agent_token").notNull().unique(),
  status: text("status", { enum: ["online", "offline"] })
    .notNull()
    .default("offline"),
  lastSeen: integer("last_seen", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const mcpEndpoints = sqliteTable("mcp_endpoints", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  urlToken: text("url_token").notNull().unique(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const endpointServerAccess = sqliteTable("endpoint_server_access", {
  id: text("id").primaryKey(),
  endpointId: text("endpoint_id")
    .notNull()
    .references(() => mcpEndpoints.id, { onDelete: "cascade" }),
  serverId: text("server_id")
    .notNull()
    .references(() => servers.id, { onDelete: "cascade" }),
  abilities: text("abilities", { mode: "json" })
    .notNull()
    .$type<{
      executeCommand: boolean;
      readOutput: boolean;
      serverInfo: boolean;
      disconnect: boolean;
    }>(),
});

export const serverCommandRules = sqliteTable("server_command_rules", {
  id: text("id").primaryKey(),
  serverId: text("server_id")
    .notNull()
    .references(() => servers.id, { onDelete: "cascade" }),
  ruleType: text("rule_type", { enum: ["whitelist", "blacklist"] }).notNull(),
  pattern: text("pattern").notNull(),
});

export const commandHistory = sqliteTable("command_history", {
  id: text("id").primaryKey(),
  serverId: text("server_id")
    .notNull()
    .references(() => servers.id),
  endpointId: text("endpoint_id").references(() => mcpEndpoints.id),
  command: text("command").notNull(),
  output: text("output"),
  status: text("status", {
    enum: ["running", "completed", "failed", "timeout"],
  }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
