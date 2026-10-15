import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requestKey } from "@/lib/rate-limit";
import { getSupabaseAdmin, storageBucket } from "@/lib/supabase-admin";
import { uploadSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limit = Math.max(1, Number(process.env.UPLOADS_PER_HOUR) || 5);
  if (!checkRateLimit(`upload:${requestKey(request)}`, limit, 60 * 60 * 1000)) return NextResponse.json({ error: "Upload limit reached. Please try again later." }, { status: 429 });
  const maxBytes = Math.max(1024, Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxBytes + 1024 * 1024) return NextResponse.json({ error: "Upload request is too large." }, { status: 413 });
  let file: File;
  let fields: Record<string, FormDataEntryValue>;
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (!(value instanceof File)) return NextResponse.json({ error: "Choose a PDF file to upload." }, { status: 400 });
    file = value;
    fields = Object.fromEntries(["title", "description", "branchName", "subjectName", "semester", "resourceType", "academicYear", "contributorName"].map((key) => [key, form.get(key) || ""]));
  } catch { return NextResponse.json({ error: "Invalid upload request." }, { status: 400 }); }
  if (!file.size || file.size > maxBytes) return NextResponse.json({ error: `File must be between 1 byte and ${Math.round(maxBytes / 1024 / 1024)} MB.` }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && !["application/pdf", "application/octet-stream"].includes(file.type))) return NextResponse.json({ error: "Only PDF files are supported." }, { status: 415 });
  const prefix = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (new TextDecoder().decode(prefix) !== "%PDF-") return NextResponse.json({ error: "The selected file does not contain a valid PDF header." }, { status: 415 });
  const parsed = uploadSchema.safeParse(fields);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the required fields." }, { status: 400 });
  const metadata = parsed.data;
  let db: ReturnType<typeof getSupabaseAdmin>;
  try { db = getSupabaseAdmin(); } catch { return NextResponse.json({ error: "The server is not connected to Supabase. Configure the server-only Supabase key and retry." }, { status: 503 }); }
  const branchName = metadata.branchName.replace(/\s+/g, " ");
  const subjectName = metadata.subjectName.replace(/\s+/g, " ");
  const branchCodeBase = branchName.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 16) || "BRANCH";
  const branchLookup = await db.from("branches").select("id").ilike("name", branchName).eq("is_active", true).maybeSingle();
  let branch = branchLookup.data;
  const branchLookupError = branchLookup.error;
  if (branchLookupError) return NextResponse.json({ error: "Branch could not be checked. Please retry." }, { status: 503 });
  if (!branch) {
    const created = await db.from("branches").insert({ name: branchName, code: `${branchCodeBase}-${randomUUID().slice(0, 6).toUpperCase()}` }).select("id").single();
    if (created.error) {
      const retry = await db.from("branches").select("id").ilike("name", branchName).eq("is_active", true).maybeSingle();
      if (retry.error || !retry.data) return NextResponse.json({ error: "Branch could not be saved. Please retry." }, { status: 503 });
      branch = retry.data;
    } else branch = created.data;
  }
  const subjectLookup = await db.from("subjects").select("id").ilike("name", subjectName).eq("branch_id", branch.id).eq("semester", metadata.semester).eq("is_active", true).maybeSingle();
  let subject = subjectLookup.data;
  const subjectLookupError = subjectLookup.error;
  if (subjectLookupError) return NextResponse.json({ error: "Subject could not be checked. Please retry." }, { status: 503 });
  if (!subject) {
    const created = await db.from("subjects").insert({ name: subjectName, branch_id: branch.id, semester: metadata.semester }).select("id").single();
    if (created.error) {
      const retry = await db.from("subjects").select("id").ilike("name", subjectName).eq("branch_id", branch.id).eq("semester", metadata.semester).eq("is_active", true).maybeSingle();
      if (retry.error || !retry.data) return NextResponse.json({ error: "Subject could not be saved. Please retry." }, { status: 503 });
      subject = retry.data;
    } else subject = created.data;
  }
  const id = randomUUID();
  const reference = `CV-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const path = `pending/${id}.pdf`;
  const { error: storageError } = await db.storage.from(storageBucket()).upload(path, file, { contentType: "application/pdf", upsert: false });
  if (storageError) return NextResponse.json({ error: "File storage failed. Please retry." }, { status: 502 });
  const { error: insertError } = await db.from("resources").insert({
    id, submission_reference: reference, title: metadata.title, description: metadata.description || null,
    branch_id: branch.id, subject_id: subject.id, semester: metadata.semester,
    resource_type: metadata.resourceType, academic_year: metadata.academicYear || null,
    contributor_name: metadata.contributorName || null, storage_path: path,
    original_file_name: file.name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 200), file_size: file.size,
    mime_type: "application/pdf", moderation_status: "pending",
  });
  if (insertError) {
    await db.storage.from(storageBucket()).remove([path]);
    return NextResponse.json({ error: "Submission could not be recorded. No upload was completed." }, { status: 502 });
  }
  return NextResponse.json({ reference }, { status: 201 });
}
