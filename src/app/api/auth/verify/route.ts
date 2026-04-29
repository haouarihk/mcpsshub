import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminToken } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const adminToken = await getAdminToken();
  if (token !== adminToken) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("mcpsshub_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  const adminToken = await getAdminToken();
  if (!adminToken) {
    return NextResponse.json({ authenticated: false });
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("mcpsshub_token")?.value;

  return NextResponse.json({
    authenticated: cookieToken === adminToken,
  });
}
