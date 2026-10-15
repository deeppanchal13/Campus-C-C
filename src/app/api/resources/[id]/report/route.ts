import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requestKey } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { reportSchema } from "@/lib/validation";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!checkRateLimit(`report:${requestKey(request)}`, 5, 60 * 60 * 1000)) return NextResponse.json({ error: "Report limit reached. Please try later." }, { status: 429 });
  const input = reportSchema.safeParse(await request.json().catch(() => null));
  if (!input.success || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Check the report details." }, { status: 400 });
  try {
    const db = getSupabaseAdmin();
    const { data: resource } = await db.from("resources").select("id").eq("id", id).eq("moderation_status", "approved").maybeSingle();
    if (!resource) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    const { error } = await db.from("resource_reports").insert({ id: randomUUID(), resource_id: id, reason: input.data.reason, details: input.data.details || null });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch { return NextResponse.json({ error: "Report could not be submitted." }, { status: 503 }); }
}
