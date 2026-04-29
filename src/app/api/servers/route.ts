import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { generateId, generateToken } from "@/lib/crypto";
import { connectionManager } from "@/lib/connection-manager";

export async function GET(request: Request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const allServers = db.select().from(servers).all();

  const result = allServers.map((s) => ({
    ...s,
    status: connectionManager.isOnline(s.id) ? "online" : "offline",
    agentToken: undefined,
    scriptToken: undefined,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const id = generateId();
  const agentToken = generateToken();
  const scriptToken = generateToken(24);

  const server = {
    id,
    name: body.name || `Server ${id.slice(0, 6)}`,
    hostname: null,
    ip: null,
    os: null,
    agentToken,
    scriptToken,
    status: "offline" as const,
    lastSeen: null,
    createdAt: new Date(),
  };

  db.insert(servers).values(server).run();

  return NextResponse.json({ ...server, agentToken, scriptToken }, { status: 201 });
}
