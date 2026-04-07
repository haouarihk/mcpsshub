import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { mcpEndpoints } from "@/db/schema";
import { generateId, generateToken } from "@/lib/crypto";

export async function GET(request: Request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const endpoints = db.select().from(mcpEndpoints).all();
  return NextResponse.json(endpoints);
}

export async function POST(request: Request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const id = generateId();
  const urlToken = generateToken(32);

  const endpoint = {
    id,
    name: body.name || `Endpoint ${id.slice(0, 6)}`,
    urlToken,
    enabled: true,
    createdAt: new Date(),
  };

  db.insert(mcpEndpoints).values(endpoint).run();
  return NextResponse.json(endpoint, { status: 201 });
}
