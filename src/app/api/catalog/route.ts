import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const [branches, subjects] = await Promise.all([
      db.from("branches").select("id,name,code").eq("is_active", true).order("name"),
      db.from("subjects").select("id,name,code,branch_id,semester").eq("is_active", true).order("name"),
    ]);
    if (branches.error || subjects.error) throw new Error("catalog unavailable");
    return NextResponse.json({ branches: branches.data, subjects: subjects.data });
  } catch { return NextResponse.json({ error: "Catalogue is unavailable. Configure Supabase and apply the database seed." }, { status: 503 }); }
}
