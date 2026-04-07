"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = await login(token);
    if (!success) setError("Invalid token");
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8">RemoteClaw</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Admin Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter your admin token"
              autoFocus
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded py-2 transition-colors"
          >
            Login
          </button>
        </form>
        <p className="text-gray-600 text-xs text-center mt-4">
          Check the server console output for the initial admin token
        </p>
      </div>
    </div>
  );
}
