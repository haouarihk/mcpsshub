import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { serverCommandRules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/crypto";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const rules = db
    .select()
    .from(serverCommandRules)
    .where(eq(serverCommandRules.serverId, id))
    .all();

  return NextResponse.json(rules);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  const rule = {
    id: generateId(),
    serverId: id,
    ruleType: body.ruleType as "whitelist" | "blacklist",
    pattern: body.pattern,
  };

  db.insert(serverCommandRules).values(rule).run();
  return NextResponse.json(rule, { status: 201 });
}
