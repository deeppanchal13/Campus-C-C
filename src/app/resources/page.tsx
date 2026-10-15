import { Suspense } from "react";
import { Footer, SiteNav } from "@/components/site-nav";
import { ResourceSearch } from "@/components/resource-search";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Branch, Subject } from "@/lib/types";

async function catalog() {
  try { const db = getSupabaseAdmin(); const [b, s] = await Promise.all([db.from("branches").select("id,name,code").eq("is_active", true).order("name"), db.from("subjects").select("id,name,code,branch_id,semester").eq("is_active", true).order("name")]); if (b.error || s.error) throw new Error(); return { branches: b.data as Branch[], subjects: s.data as Subject[] }; } catch { return { branches: [], subjects: [] }; }
}
export default async function ResourcesPage() { const data = await catalog(); return <><SiteNav/><main className="page"><div className="shell"><h1 className="page-title">Explore resources</h1><p className="page-lead">Search community shared study materials. No account needed.</p><Suspense fallback={<div className="empty">Loading search…</div>}><ResourceSearch catalog={data}/></Suspense></div></main><Footer/></>; }
