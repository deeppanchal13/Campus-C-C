import Link from "next/link";
import { Footer, SiteNav } from "@/components/site-nav";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export default async function SubjectsPage() {
  let subjects: { id: string; name: string; semester: number; branch_id: string | null; branches: { name: string } | null }[] = [];
  try { const { data } = await getSupabaseAdmin().from("subjects").select("id,name,semester,branch_id,branches(name)").eq("is_active", true).order("name"); subjects = (data || []) as unknown as typeof subjects; } catch { /* Supabase is optional during local setup. */ }
  return <><SiteNav/><main className="page"><div className="shell"><h1 className="page-title">Browse subjects</h1><p className="page-lead">Explore resources by subject. Catalogue entries are starter examples and may be customized by an administrator.</p>{subjects.length ? <div className="cards">{subjects.map((s) => <Link className="card" key={s.id} href={`/resources?subject=${s.id}`}><span className="tag">Semester {s.semester}</span><h3 style={{ marginTop: 14 }}>{s.name}</h3><p>{s.branches?.name || "Shared subject"}</p><div className="card-foot"><span>Explore resources</span><span>→</span></div></Link>)}</div> : <div className="empty">Catalogue unavailable. Apply the Supabase migration and seed to browse subjects.</div>}</div></main><Footer/></>;
}
