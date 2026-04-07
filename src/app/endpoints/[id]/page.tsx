"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useAuth } from "@/components/auth-provider";
import { Nav } from "@/components/nav";
import { CopyButton } from "@/components/copy-button";
import { useRouter } from "next/navigation";

interface Endpoint {
  id: string;
  name: string;
  urlToken: string;
  enabled: boolean;
}

interface Server {
  id: string;
  name: string;
  hostname: string | null;
  status: string;
}

interface AccessEntry {
  id: string;
  endpointId: string;
  serverId: string;
  abilities: {
    executeCommand: boolean;
    readOutput: boolean;
    serverInfo: boolean;
    disconnect: boolean;
  };
}

const defaultAbilities = {
  executeCommand: true,
  readOutput: true,
  serverInfo: true,
  disconnect: false,
};

export default function EndpointDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { authenticated, loading } = useAuth();
  const router = useRouter();
  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [access, setAccess] = useState<AccessEntry[]>([]);

  const fetchEndpoint = useCallback(async () => {
    const res = await fetch(`/api/endpoints/${id}`);
    if (res.ok) setEndpoint(await res.json());
  }, [id]);

  const fetchServers = useCallback(async () => {
    const res = await fetch("/api/servers");
    if (res.ok) setServers(await res.json());
  }, []);

  const fetchAccess = useCallback(async () => {
    const res = await fetch(`/api/endpoints/${id}/access`);
    if (res.ok) setAccess(await res.json());
  }, [id]);

  useEffect(() => {
    if (authenticated) {
      fetchEndpoint();
      fetchServers();
      fetchAccess();
    }
  }, [authenticated, fetchEndpoint, fetchServers, fetchAccess]);

  const toggleServerAccess = (serverId: string) => {
    const existing = access.find((a) => a.serverId === serverId);
    let newAccess: AccessEntry[];

    if (existing) {
      newAccess = access.filter((a) => a.serverId !== serverId);
    } else {
      newAccess = [
        ...access,
        {
          id: "",
          endpointId: id,
          serverId,
          abilities: { ...defaultAbilities },
        },
      ];
    }

    setAccess(newAccess);
    saveAccess(newAccess);
  };

  const toggleAbility = (
    serverId: string,
    ability: keyof AccessEntry["abilities"]
  ) => {
    const newAccess = access.map((a) => {
      if (a.serverId === serverId) {
        return {
          ...a,
          abilities: { ...a.abilities, [ability]: !a.abilities[ability] },
        };
      }
      return a;
    });
    setAccess(newAccess);
    saveAccess(newAccess);
  };

  const saveAccess = async (entries: AccessEntry[]) => {
    await fetch(`/api/endpoints/${id}/access`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        entries.map((e) => ({
          serverId: e.serverId,
          abilities: e.abilities,
        }))
      ),
    });
  };

  const deleteEndpoint = async () => {
    if (!confirm("Delete this endpoint?")) return;
    await fetch(`/api/endpoints/${id}`, { method: "DELETE" });
    router.push("/endpoints");
  };

  if (loading || !authenticated || !endpoint) return null;

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const mcpUrl = `${origin}/mcp/${endpoint.urlToken}`;

  return (
    <>
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold mb-6">{endpoint.name}</h1>

        {/* Connection String */}
        <section className="bg-gray-900 border border-gray-800 rounded p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">
            MCP Connection String
          </h2>
          <p className="text-xs text-gray-600 mb-2">
            Use this URL in Claude Code or any MCP-capable AI tool:
          </p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 bg-gray-950 rounded p-3 text-sm text-blue-400 break-all">
              {mcpUrl}
            </code>
            <CopyButton text={mcpUrl} />
          </div>
          <p className="text-xs text-gray-600 mt-3">
            For Claude Code, add this to your MCP config or run:
          </p>
          <div className="flex gap-2 items-center mt-1">
            <code className="flex-1 bg-gray-950 rounded p-2 text-xs text-gray-400 break-all">
              claude mcp add remoteclaw --transport http {mcpUrl}
            </code>
            <CopyButton
              text={`claude mcp add remoteclaw --transport http ${mcpUrl}`}
              label="Copy"
              className="text-xs"
            />
          </div>
        </section>

        {/* Server Access */}
        <section className="bg-gray-900 border border-gray-800 rounded p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">
            Server Access
          </h2>
          {servers.length === 0 ? (
            <p className="text-sm text-gray-600">
              No servers available. Add servers first.
            </p>
          ) : (
            <div className="space-y-3">
              {servers.map((server) => {
                const entry = access.find((a) => a.serverId === server.id);
                const hasAccess = !!entry;

                return (
                  <div
                    key={server.id}
                    className="border border-gray-800 rounded p-3"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        checked={hasAccess}
                        onChange={() => toggleServerAccess(server.id)}
                        className="accent-blue-500"
                      />
                      <span className="font-medium text-sm">
                        {server.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {server.hostname || server.id}
                      </span>
                      <span
                        className={`text-xs ${
                          server.status === "online"
                            ? "text-green-400"
                            : "text-gray-600"
                        }`}
                      >
                        {server.status}
                      </span>
                    </div>
                    {hasAccess && entry && (
                      <div className="ml-6 flex gap-4 text-xs">
                        {(
                          Object.keys(defaultAbilities) as Array<
                            keyof typeof defaultAbilities
                          >
                        ).map((ability) => (
                          <label
                            key={ability}
                            className="flex items-center gap-1.5 text-gray-400"
                          >
                            <input
                              type="checkbox"
                              checked={entry.abilities[ability]}
                              onChange={() =>
                                toggleAbility(server.id, ability)
                              }
                              className="accent-blue-500"
                            />
                            {ability.replace(/([A-Z])/g, " $1").trim()}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Danger Zone */}
        <section className="border border-red-900/50 rounded p-4">
          <button
            onClick={deleteEndpoint}
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Delete Endpoint
          </button>
        </section>
      </div>
    </>
  );
}
