import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";
const branchSchema = z.object({ name: z.string().trim().min(2).max(120), code: z.string().trim().min(2).max(20).transform((s) => s.toUpperCase()) });
const subjectSchema = z.object({ name: z.string().trim().min(2).max(150), code: z.string().trim().max(20).optional(), branchId: z.string().uuid().nullable().optional(), semester: z.number().int().min(1).max(12) });
export async function GET() { if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { const db = getSupabaseAdmin(); const [branches, subjects] = await Promise.all([db.from("branches").select("*").order("name"), db.from("subjects").select("*").order("name")]); return NextResponse.json({ branches: branches.data || [], subjects: subjects.data || [] }); } catch { return NextResponse.json({ error: "Catalogue unavailable" }, { status: 503 }); } }
export async function POST(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await request.json().catch(() => null);
  if (!data || !["branch", "subject"].includes(data.kind)) return NextResponse.json({ error: "Invalid catalogue entry" }, { status: 400 });
  const db = getSupabaseAdmin();
  if (data.kind === "branch") {
    const input = branchSchema.safeParse(data);
    if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message || "Invalid branch" }, { status: 400 });
    const { error } = await db.from("branches").insert({ name: input.data.name, code: input.data.code });
    if (error) return NextResponse.json({ error: "Branch could not be created. Check for a duplicate code or name." }, { status: 409 });
  } else {
    const input = subjectSchema.safeParse(data);
    if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message || "Invalid subject" }, { status: 400 });
    const { error } = await db.from("subjects").insert({ name: input.data.name, code: input.data.code || null, branch_id: input.data.branchId || null, semester: input.data.semester });
    if (error) return NextResponse.json({ error: "Subject could not be created. Check the branch and for a duplicate entry." }, { status: 409 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
export async function PATCH(request: NextRequest) { if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const data=await request.json().catch(()=>null); if(!data||!['branch','subject'].includes(data.kind)||!/^[0-9a-f-]{36}$/i.test(data.id)||typeof data.is_active!=="boolean"||typeof data.name!=="string"||data.name.trim().length<2||data.name.length>150)return NextResponse.json({error:"Invalid catalogue update"},{status:400}); const table=data.kind==="branch"?"branches":"subjects"; try{const{error}=await getSupabaseAdmin().from(table).update({name:data.name.trim(),is_active:data.is_active}).eq("id",data.id);if(error)throw error;return NextResponse.json({ok:true})}catch{return NextResponse.json({error:"Catalogue update failed"},{status:503})} }
