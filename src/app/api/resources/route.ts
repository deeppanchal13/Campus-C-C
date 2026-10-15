import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Math.min(1000, Number(params.get("page")) || 1));
  const pageSize = 12;
  const search = (params.get("q") || "").trim().slice(0, 120);
  const uuid = (value: string | null) => value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
  const branch = uuid(params.get("branch"));
  const subject = uuid(params.get("subject"));
  const semesterValue = Number(params.get("semester"));
  const semester = Number.isInteger(semesterValue) && semesterValue >= 1 && semesterValue <= 12 ? semesterValue : null;
  const allowedTypes = ["Notes", "PYQs", "Assignments", "Lab Manuals", "Presentations", "Reference Materials", "Other"];
  const typeValue = params.get("type");
  const type = allowedTypes.includes(typeValue || "") ? typeValue : null;
  const yearValue = params.get("year") || "";
  const year = /^\d{4}(-\d{4})?$/.test(yearValue) ? yearValue : null;
  const popular = params.get("sort") === "popular";
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db.rpc("search_approved_resources", { query_text: search, branch_filter: branch, subject_filter: subject, semester_filter: semester, type_filter: type, year_filter: year, sort_popular: popular, page_offset: (page - 1) * pageSize, page_limit: pageSize });
    if (error) throw error;
    const count = data?.[0]?.total_count || 0;
    return NextResponse.json({ resources: (data || []).map((row: Record<string, unknown>) => { const { total_count: _total, ...resource } = row; return resource; }), count, page, pageSize });
  } catch { return NextResponse.json({ error: "Resources could not be loaded." }, { status: 503 }); }
}
