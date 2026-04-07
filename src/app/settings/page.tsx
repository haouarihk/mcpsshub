"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { Nav } from "@/components/nav";

interface Settings {
  adminToken: string | null;
  serverCount: number;
  endpointCount: number;
  onlineServers: number;
}

export default function SettingsPage() {
  const { authenticated, loading, logout } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [newToken, setNewToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    if (res.ok) setSettings(await res.json());
  }, []);

  useEffect(() => {
    if (authenticated) fetchSettings();
  }, [authenticated, fetchSettings]);

  const changeToken = async () => {
    if (!newToken) return;
    if (!confirm("Are you sure? You will be logged out.")) return;
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken: newToken }),
    });
    if (res.ok) {
      setSaved(true);
      setNewToken("");
      setTimeout(() => logout(), 1500);
    }
    setSaving(false);
  };

  if (loading || !authenticated) return null;

  return (
    <>
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold mb-6">Settings</h1>

        {/* System Status */}
        <section className="bg-gray-900 border border-gray-800 rounded p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">
            System Status
          </h2>
          {settings && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-950 rounded p-3 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {settings.onlineServers}
                </div>
                <div className="text-xs text-gray-500">Online Servers</div>
              </div>
              <div className="bg-gray-950 rounded p-3 text-center">
                <div className="text-2xl font-bold">
                  {settings.serverCount}
                </div>
                <div className="text-xs text-gray-500">Total Servers</div>
              </div>
              <div className="bg-gray-950 rounded p-3 text-center">
                <div className="text-2xl font-bold">
                  {settings.endpointCount}
                </div>
                <div className="text-xs text-gray-500">MCP Endpoints</div>
              </div>
            </div>
          )}
        </section>

        {/* Admin Token */}
        <section className="bg-gray-900 border border-gray-800 rounded p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">
            Admin Token
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            Current token: <code className="text-gray-400">{settings?.adminToken}</code>
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              placeholder="New admin token"
              className="flex-1 bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={changeToken}
              disabled={saving || !newToken}
              className="bg-red-600 hover:bg-red-500 text-white text-sm px-4 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              {saved ? "Saved! Logging out..." : "Change Token"}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
