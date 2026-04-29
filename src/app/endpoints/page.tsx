"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { Nav } from "@/components/nav";
import Link from "next/link";

const EXAMPLE_TEMPLATES = [
  { label: "Custom endpoint", name: "" },
  { label: "OpenCode", name: "OpenCode" },
  { label: "Claude Desktop", name: "Claude Desktop" },
];

interface Endpoint {
  id: string;
  name: string;
  urlToken: string;
  enabled: boolean;
  createdAt: string;
}

export default function EndpointsPage() {
  const { authenticated, loading } = useAuth();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleTemplateChange = (index: number) => {
    setSelectedTemplate(index);
    if (EXAMPLE_TEMPLATES[index].name) {
      setName(EXAMPLE_TEMPLATES[index].name);
    }
  };

  const fetchEndpoints = useCallback(async () => {
    const res = await fetch("/api/endpoints");
    if (res.ok) setEndpoints(await res.json());
  }, []);

  useEffect(() => {
    if (authenticated) fetchEndpoints();
  }, [authenticated, fetchEndpoints]);

  const createEndpoint = async () => {
    setCreating(true);
    const res = await fetch("/api/endpoints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || undefined }),
    });
    if (res.ok) {
      setName("");
      fetchEndpoints();
    }
    setCreating(false);
  };

  const toggleEnabled = async (endpoint: Endpoint) => {
    await fetch(`/api/endpoints/${endpoint.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !endpoint.enabled }),
    });
    fetchEndpoints();
  };

  if (loading || !authenticated) return null;

  return (
    <>
      <Nav />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">MCP Endpoints</h1>
          <div className="flex gap-2">
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(Number(e.target.value))}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            >
              {EXAMPLE_TEMPLATES.map((t, i) => (
                <option key={i} value={i}>{t.label}</option>
              ))}
            </select>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Endpoint name"
              className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={createEndpoint}
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              Create Endpoint
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {endpoints.length === 0 && (
            <p className="text-gray-500 text-sm">
              No endpoints yet. Create one to connect AI tools.
            </p>
          )}
          {endpoints.map((ep) => (
            <div
              key={ep.id}
              className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded p-4"
            >
              <button
                onClick={() => toggleEnabled(ep)}
                className={`w-2.5 h-2.5 rounded-full ${
                  ep.enabled ? "bg-green-500" : "bg-gray-600"
                }`}
                title={ep.enabled ? "Enabled - click to disable" : "Disabled - click to enable"}
              />
              <Link
                href={`/endpoints/${ep.id}`}
                className="flex-1 min-w-0 hover:text-blue-400 transition-colors"
              >
                <div className="font-medium">{ep.name}</div>
                <div className="text-sm text-gray-500 truncate">
                  /mcp/{ep.urlToken.slice(0, 16)}...
                </div>
              </Link>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  ep.enabled
                    ? "bg-green-900/50 text-green-400"
                    : "bg-gray-800 text-gray-500"
                }`}
              >
                {ep.enabled ? "Active" : "Disabled"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
