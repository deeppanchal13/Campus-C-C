import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requestKey } from "@/lib/rate-limit";
import { getSupabaseAdmin, storageBucket } from "@/lib/supabase-admin";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("resources").select("id,title,description,resource_type,academic_year,contributor_name,original_file_name,file_size,mime_type,created_at,download_count,semester,branch_id,subject_id,storage_path,branch:branches(name,code),subject:subjects(name)").eq("id", id).eq("moderation_status", "approved").maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    const disposition = request.nextUrl.searchParams.get("download") === "1";
    if (disposition && !checkRateLimit(`download:${requestKey(request)}:${id}`, 20, 60 * 60 * 1000)) return NextResponse.json({ error: "Download limit reached. Try again later." }, { status: 429 });
    const { data: signed, error: signError } = await db.storage.from(storageBucket()).createSignedUrl(data.storage_path, 60, { download: disposition ? data.original_file_name : false });
    if (signError || !signed?.signedUrl) return NextResponse.json({ error: "This file is currently unavailable." }, { status: 503 });
    if (disposition) { const { error: countError } = await db.rpc("increment_resource_download", { resource_uuid: id }); if (countError) return NextResponse.json({ error: "Download could not be recorded." }, { status: 503 }); }
    const { storage_path: _path, ...safe } = data;
    return NextResponse.json({ resource: safe, fileUrl: signed.signedUrl });
  } catch { return NextResponse.json({ error: "Resource is currently unavailable." }, { status: 503 }); }
}
