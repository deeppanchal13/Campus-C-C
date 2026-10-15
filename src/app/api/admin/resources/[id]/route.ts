import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin, storageBucket } from "@/lib/supabase-admin";
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try { const db = getSupabaseAdmin(); const { data, error } = await db.from("resources").select("*").eq("id", id).maybeSingle(); if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 }); const { data: signed } = await db.storage.from(storageBucket()).createSignedUrl(data.storage_path, 120); return NextResponse.json({ resource: { ...data, storage_path: undefined }, fileUrl: signed?.signedUrl }); } catch { return NextResponse.json({ error: "Resource unavailable" }, { status: 503 }); }
}
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params; const data = await request.json().catch(() => null);
  if (!data || !["approved", "rejected", "removed"].includes(data.status) || typeof data.reason !== "string" || data.reason.length > 1000 || (data.status === "rejected" && !data.reason.trim())) return NextResponse.json({ error: "Invalid moderation action. Rejections require a reason." }, { status: 400 });
  try {
    const { error } = await getSupabaseAdmin().rpc("moderate_resource", { resource_uuid: id, next_status: data.status, reason_text: data.reason.trim() || null, admin_name: process.env.ADMIN_USERNAME || "admin" });
    if (error) { if (error.message.includes("not found")) return NextResponse.json({ error: "Resource not found." }, { status: 404 }); throw error; }
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Moderation action could not be saved." }, { status: 503 }); }
}
