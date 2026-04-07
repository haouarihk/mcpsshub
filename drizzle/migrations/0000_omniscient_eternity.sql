CREATE TABLE `command_history` (
	`id` text PRIMARY KEY NOT NULL,
	`server_id` text NOT NULL,
	`endpoint_id` text,
	`command` text NOT NULL,
	`output` text,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`endpoint_id`) REFERENCES `mcp_endpoints`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `endpoint_server_access` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint_id` text NOT NULL,
	`server_id` text NOT NULL,
	`abilities` text NOT NULL,
	FOREIGN KEY (`endpoint_id`) REFERENCES `mcp_endpoints`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mcp_endpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url_token` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mcp_endpoints_url_token_unique` ON `mcp_endpoints` (`url_token`);--> statement-breakpoint
CREATE TABLE `server_command_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`server_id` text NOT NULL,
	`rule_type` text NOT NULL,
	`pattern` text NOT NULL,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `servers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`hostname` text,
	`ip` text,
	`os` text,
	`agent_token` text NOT NULL,
	`status` text DEFAULT 'offline' NOT NULL,
	`last_seen` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `servers_agent_token_unique` ON `servers` (`agent_token`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
