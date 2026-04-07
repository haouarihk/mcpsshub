import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { mcpEndpoints } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const endpoint = db
    .select()
    .from(mcpEndpoints)
    .where(eq(mcpEndpoints.id, id))
    .get();

  if (!endpoint) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(endpoint);
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
  if (body.enabled !== undefined) updates.enabled = body.enabled;

  db.update(mcpEndpoints).set(updates).where(eq(mcpEndpoints.id, id)).run();

  const endpoint = db
    .select()
    .from(mcpEndpoints)
    .where(eq(mcpEndpoints.id, id))
    .get();
  return NextResponse.json(endpoint);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  db.delete(mcpEndpoints).where(eq(mcpEndpoints.id, id)).run();
  return NextResponse.json({ success: true });
}
