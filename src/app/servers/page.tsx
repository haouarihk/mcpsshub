"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { Nav } from "@/components/nav";
import Link from "next/link";

interface Server {
  id: string;
  name: string;
  hostname: string | null;
  ip: string | null;
  os: string | null;
  status: string;
  lastSeen: string | null;
  createdAt: string;
  agentToken?: string;
}

export default function ServersPage() {
  const { authenticated, loading } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [creating, setCreating] = useState(false);
  const [newServer, setNewServer] = useState<Server | null>(null);
  const [name, setName] = useState("");

  const fetchServers = useCallback(async () => {
    const res = await fetch("/api/servers");
    if (res.ok) setServers(await res.json());
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchServers();
      const interval = setInterval(fetchServers, 5000);
      return () => clearInterval(interval);
    }
  }, [authenticated, fetchServers]);

  const createServer = async () => {
    setCreating(true);
    const res = await fetch("/api/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || undefined }),
    });
    if (res.ok) {
      const server = await res.json();
      setNewServer(server);
      setName("");
      fetchServers();
    }
    setCreating(false);
  };

  if (loading) return null;
  if (!authenticated) return null;

  return (
    <>
      <Nav />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Servers</h1>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Server name"
              className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={createServer}
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              Add Server
            </button>
          </div>
        </div>

        {newServer && (
          <div className="bg-green-900/30 border border-green-700 rounded p-4 mb-6">
            <h3 className="font-medium text-green-400 mb-2">
              Server Created: {newServer.name}
            </h3>
            <p className="text-sm text-gray-300 mb-2">
              Run this on your target server to connect it:
            </p>
            <code className="block bg-gray-900 rounded p-3 text-sm text-gray-300 break-all">
              curl -sL {typeof window !== "undefined" ? window.location.origin : ""}/api/agent-script/{newServer.id} -H &quot;Authorization: Bearer $(cat ~/.remoteclaw-token 2&gt;/dev/null)&quot; | bash
            </code>
            <p className="text-xs text-gray-500 mt-2">
              Agent Token: <code className="text-gray-400">{newServer.agentToken}</code>
            </p>
            <button
              onClick={() => setNewServer(null)}
              className="mt-2 text-sm text-gray-500 hover:text-gray-300"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-2">
          {servers.length === 0 && (
            <p className="text-gray-500 text-sm">
              No servers yet. Click &quot;Add Server&quot; to get started.
            </p>
          )}
          {servers.map((server) => (
            <Link
              key={server.id}
              href={`/servers/${server.id}`}
              className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded p-4 hover:border-gray-700 transition-colors"
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  server.status === "online" ? "bg-green-500" : "bg-gray-600"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{server.name}</div>
                <div className="text-sm text-gray-500">
                  {server.hostname || "Not connected yet"}
                  {server.ip && ` (${server.ip})`}
                  {server.os && ` - ${server.os}`}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {server.status === "online" ? (
                  <span className="text-green-400">Online</span>
                ) : (
                  <span>Offline</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
