"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useAuth } from "@/components/auth-provider";
import { Nav } from "@/components/nav";
import { CopyButton } from "@/components/copy-button";
import { useRouter } from "next/navigation";

interface Server {
  id: string;
  name: string;
  hostname: string | null;
  ip: string | null;
  os: string | null;
  status: string;
  lastSeen: string | null;
  agentToken: string;
  scriptToken: string;
}

interface Rule {
  id: string;
  serverId: string;
  ruleType: "whitelist" | "blacklist";
  pattern: string;
}

export default function ServerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { authenticated, loading } = useAuth();
  const router = useRouter();
  const [server, setServer] = useState<Server | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [newRuleType, setNewRuleType] = useState<"whitelist" | "blacklist">(
    "blacklist"
  );
  const [newRulePattern, setNewRulePattern] = useState("");

  const fetchServer = useCallback(async () => {
    const res = await fetch(`/api/servers/${id}`);
    if (res.ok) setServer(await res.json());
  }, [id]);

  const fetchRules = useCallback(async () => {
    const res = await fetch(`/api/servers/${id}/rules`);
    if (res.ok) setRules(await res.json());
  }, [id]);

  useEffect(() => {
    if (authenticated) {
      fetchServer();
      fetchRules();
      const interval = setInterval(fetchServer, 5000);
      return () => clearInterval(interval);
    }
  }, [authenticated, fetchServer, fetchRules]);

  const addRule = async () => {
    if (!newRulePattern) return;
    await fetch(`/api/servers/${id}/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ruleType: newRuleType,
        pattern: newRulePattern,
      }),
    });
    setNewRulePattern("");
    fetchRules();
  };

  const deleteRule = async (ruleId: string) => {
    await fetch(`/api/servers/${id}/rules/${ruleId}`, { method: "DELETE" });
    fetchRules();
  };

  const deleteServer = async () => {
    if (!confirm("Delete this server?")) return;
    await fetch(`/api/servers/${id}`, { method: "DELETE" });
    router.push("/servers");
  };

  if (loading || !authenticated) return null;
  if (!server) return null;

  const scriptUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/agent-script/${server.id}/${server.scriptToken}`;

  return (
    <>
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <div
            className={`w-3 h-3 rounded-full ${
              server.status === "online" ? "bg-green-500" : "bg-gray-600"
            }`}
          />
          <h1 className="text-xl font-semibold">{server.name}</h1>
          <span className="text-sm text-gray-500">
            {server.status === "online" ? "Online" : "Offline"}
          </span>
        </div>

        {/* Server Info */}
        <section className="bg-gray-900 border border-gray-800 rounded p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">
            Server Info
          </h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div className="text-gray-500">Hostname</div>
            <div>{server.hostname || "-"}</div>
            <div className="text-gray-500">IP</div>
            <div>{server.ip || "-"}</div>
            <div className="text-gray-500">OS</div>
            <div>{server.os || "-"}</div>
            <div className="text-gray-500">Last Seen</div>
            <div>
              {server.lastSeen
                ? new Date(server.lastSeen).toLocaleString()
                : "-"}
            </div>
          </div>
        </section>

        {/* Agent Script */}
        <section className="bg-gray-900 border border-gray-800 rounded p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">
            Agent Script
          </h2>
          <p className="text-sm text-gray-500 mb-2">
            Run this command on the target server to connect it:
          </p>
          <div className="flex gap-2 items-start">
            <code className="flex-1 bg-gray-950 rounded p-3 text-sm text-gray-300 break-all">
              curl -sL &apos;{scriptUrl}&apos; | bash
            </code>
            <CopyButton
              text={`curl -sL '${scriptUrl}' | bash`}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Agent Token: {server.agentToken}
          </p>
        </section>

        {/* Command Rules */}
        <section className="bg-gray-900 border border-gray-800 rounded p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">
            Command Rules
          </h2>
          <p className="text-xs text-gray-600 mb-3">
            Whitelist: command must match at least one pattern. Blacklist:
            command must not match any pattern. Use * as wildcard.
          </p>

          <div className="space-y-2 mb-4">
            {rules.length === 0 && (
              <p className="text-sm text-gray-600">
                No rules. All commands are allowed.
              </p>
            )}
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center gap-3 text-sm"
              >
                <span
                  className={`px-2 py-0.5 rounded text-xs ${
                    rule.ruleType === "whitelist"
                      ? "bg-green-900/50 text-green-400"
                      : "bg-red-900/50 text-red-400"
                  }`}
                >
                  {rule.ruleType}
                </span>
                <code className="flex-1 text-gray-300">{rule.pattern}</code>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <select
              value={newRuleType}
              onChange={(e) =>
                setNewRuleType(e.target.value as "whitelist" | "blacklist")
              }
              className="bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-sm"
            >
              <option value="blacklist">Blacklist</option>
              <option value="whitelist">Whitelist</option>
            </select>
            <input
              value={newRulePattern}
              onChange={(e) => setNewRulePattern(e.target.value)}
              placeholder="Pattern (e.g., rm -rf *)"
              className="flex-1 bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={addRule}
              className="bg-gray-700 hover:bg-gray-600 text-sm px-3 py-1.5 rounded transition-colors"
            >
              Add Rule
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="border border-red-900/50 rounded p-4">
          <button
            onClick={deleteServer}
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Delete Server
          </button>
        </section>
      </div>
    </>
  );
}
