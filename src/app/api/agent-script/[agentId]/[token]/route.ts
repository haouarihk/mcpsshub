import { NextResponse } from "next/server";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateAgentScript } from "@/lib/agent-script";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string; token: string }> }
) {
  const { agentId, token } = await params;

  const server = db
    .select()
    .from(servers)
    .where(eq(servers.id, agentId))
    .get();

  if (!server || server.scriptToken !== token) {
    return NextResponse.json(
      { error: "Invalid or expired script token" },
      { status: 404 }
    );
  }

  const hostUrl = request.headers.get("origin") || `http://localhost:3000`;
  const script = generateAgentScript(server.agentToken, hostUrl);

  return new NextResponse(script, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": "attachment; filename=\"install-mcpsshub.sh\"",
    },
  });
}
