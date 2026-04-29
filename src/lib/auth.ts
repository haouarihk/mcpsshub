import { cookies } from "next/headers";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getAdminToken(): Promise<string | null> {
  const row = db
    .select()
    .from(settings)
    .where(eq(settings.key, "admin_token"))
    .get();
  return row?.value ?? null;
}

export async function verifyAuth(request: Request): Promise<boolean> {
  const adminToken = await getAdminToken();
  if (!adminToken) return false;

  // Check Authorization header
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    if (token === adminToken) return true;
  }

  // Check cookie
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("mcpsshub_token")?.value;
  if (cookieToken === adminToken) return true;

  return false;
}

export async function requireAuth(request: Request): Promise<Response | null> {
  const isAuthed = await verifyAuth(request);
  if (!isAuthed) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
