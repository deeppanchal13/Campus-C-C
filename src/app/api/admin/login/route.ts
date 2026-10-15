import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requestKey } from "@/lib/rate-limit";
import { startAdminSession, verifyAdminCredentials } from "@/lib/admin-auth";
export async function POST(request: NextRequest) {
  if (!checkRateLimit(`admin-login:${requestKey(request)}`, 8, 15 * 60 * 1000)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const data = await request.json().catch(() => null);
  if (!data || typeof data.username !== "string" || typeof data.password !== "string") return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
  try { if (!await verifyAdminCredentials(data.username, data.password)) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 }); await startAdminSession(); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Admin authentication is not configured." }, { status: 503 }); }
}
