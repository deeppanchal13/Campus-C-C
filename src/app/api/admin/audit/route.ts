import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
export async function GET() { if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { const { data, error } = await getSupabaseAdmin().from("audit_logs").select("id,admin_identifier,action,resource_id,reason,created_at").order("created_at", { ascending: false }).limit(200); if (error) throw error; return NextResponse.json({ logs: data }); } catch { return NextResponse.json({ error: "Audit log unavailable" }, { status: 503 }); } }
