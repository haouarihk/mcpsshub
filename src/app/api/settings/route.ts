import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { settings, servers, mcpEndpoints } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { connectionManager } from "@/lib/connection-manager";

export async function GET(request: Request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const adminToken = db
    .select()
    .from(settings)
    .where(eq(settings.key, "admin_token"))
    .get();

  const serverCount = db.select({ count: count() }).from(servers).get();
  const endpointCount = db.select({ count: count() }).from(mcpEndpoints).get();
  const onlineCount = connectionManager.getAll().size;

  return NextResponse.json({
    adminToken: adminToken?.value
      ? `${adminToken.value.slice(0, 8)}...`
      : null,
    serverCount: serverCount?.count ?? 0,
    endpointCount: endpointCount?.count ?? 0,
    onlineServers: onlineCount,
  });
}

export async function PUT(request: Request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const body = await request.json();

  if (body.adminToken) {
    db.update(settings)
      .set({ value: body.adminToken })
      .where(eq(settings.key, "admin_token"))
      .run();
  }

  return NextResponse.json({ success: true });
}
