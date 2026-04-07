import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateAgentScript } from "@/lib/agent-script";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { serverId } = await params;
  const server = db
    .select()
    .from(servers)
    .where(eq(servers.id, serverId))
    .get();

  if (!server) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hostUrl = process.env.HOST_URL || "http://localhost:3000";
  const script = generateAgentScript(server.agentToken, hostUrl);

  return new NextResponse(script, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="remoteclaw-agent-${serverId}.sh"`,
    },
  });
}
