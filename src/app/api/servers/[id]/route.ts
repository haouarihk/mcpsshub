import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { connectionManager } from "@/lib/connection-manager";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const server = db.select().from(servers).where(eq(servers.id, id)).get();
  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...server,
    status: connectionManager.isOnline(server.id) ? "online" : "offline",
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;

  db.update(servers).set(updates).where(eq(servers.id, id)).run();

  const server = db.select().from(servers).where(eq(servers.id, id)).get();
  return NextResponse.json(server);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  // Disconnect if online
  const conn = connectionManager.getConnection(id);
  if (conn) {
    conn.ws.close();
    connectionManager.removeConnection(id);
  }

  db.delete(servers).where(eq(servers.id, id)).run();
  return NextResponse.json({ success: true });
}
