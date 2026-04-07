import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { endpointServerAccess } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/crypto";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const access = db
    .select()
    .from(endpointServerAccess)
    .where(eq(endpointServerAccess.endpointId, id))
    .all();

  return NextResponse.json(access);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body: Array<{
    serverId: string;
    abilities: {
      executeCommand: boolean;
      readOutput: boolean;
      serverInfo: boolean;
      disconnect: boolean;
    };
  }> = await request.json();

  // Replace all access entries for this endpoint
  db.delete(endpointServerAccess)
    .where(eq(endpointServerAccess.endpointId, id))
    .run();

  for (const entry of body) {
    db.insert(endpointServerAccess)
      .values({
        id: generateId(),
        endpointId: id,
        serverId: entry.serverId,
        abilities: entry.abilities,
      })
      .run();
  }

  const access = db
    .select()
    .from(endpointServerAccess)
    .where(eq(endpointServerAccess.endpointId, id))
    .all();

  return NextResponse.json(access);
}
