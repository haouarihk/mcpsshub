import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { serverCommandRules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { ruleId } = await params;
  db.delete(serverCommandRules)
    .where(eq(serverCommandRules.id, ruleId))
    .run();

  return NextResponse.json({ success: true });
}
