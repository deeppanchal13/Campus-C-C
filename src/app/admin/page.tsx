import Link from "next/link";
import { redirect } from "next/navigation";
import { ModerationActions } from "@/components/admin-forms";
import { isAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function logout() { "use server"; const { endAdminSession } = await import("@/lib/admin-auth"); await endAdminSession(); redirect("/admin/login"); }
export default async function AdminDashboard() {
  if (!await isAdmin()) redirect("/admin/login");
  let stats = { total: 0, pending: 0, approved: 0, rejected: 0, downloads: 0, reports: 0 };
  let statsAvailable = false;
  let pending: { id: string; title: string; submission_reference: string; resource_type: string; semester: number; created_at: string; branches: { name: string } | null; subjects: { name: string } | null }[] = [];
  let approved: { id: string; title: string; submission_reference: string; resource_type: string; created_at: string }[] = [];
  try {
    const db = getSupabaseAdmin();
    const [all, wait, ok, no, events, reports, queue, publicResources] = await Promise.all([
      db.from("resources").select("id", { count: "exact", head: true }), db.from("resources").select("id", { count: "exact", head: true }).eq("moderation_status", "pending"), db.from("resources").select("id", { count: "exact", head: true }).eq("moderation_status", "approved"), db.from("resources").select("id", { count: "exact", head: true }).in("moderation_status", ["rejected", "removed"]), db.from("resources").select("download_count").eq("moderation_status", "approved"), db.from("resource_reports").select("id", { count: "exact", head: true }).eq("status", "open"), db.from("resources").select("id,title,submission_reference,resource_type,semester,created_at,branches(name),subjects(name)").eq("moderation_status", "pending").order("created_at", { ascending: true }).limit(50), db.from("resources").select("id,title,submission_reference,resource_type,created_at").eq("moderation_status", "approved").order("created_at", { ascending: false }).limit(50),
    ]);
    stats = { total: all.count || 0, pending: wait.count || 0, approved: ok.count || 0, rejected: no.count || 0, downloads: (events.data || []).reduce((sum, row) => sum + Number(row.download_count || 0), 0), reports: reports.count || 0 };
    pending = (queue.data || []) as unknown as typeof pending;
    approved = (publicResources.data || []) as unknown as typeof approved;
    statsAvailable = !all.error && !wait.error && !ok.error && !no.error && !events.error && !reports.error;
  } catch { /* Database configuration may not be complete yet. */ }
  return <main className="page"><div className="shell"><div className="inline" style={{ justifyContent: "space-between" }}><div><h1 className="page-title">Admin dashboard</h1><p className="page-lead">Moderate submissions and manage CampusVault.</p></div><form action={logout}><button className="button secondary">Sign out</button></form></div>
    <div className="inline" style={{ gap: 18, margin: "14px 0 20px" }}><Link className="text-link" href="/admin">Moderation</Link><Link className="text-link" href="/admin/catalog">Catalogue</Link><Link className="text-link" href="/admin/reports">Reports & audit</Link></div>
    {statsAvailable?<div className="stat-grid">{[["Submissions", stats.total],["Pending", stats.pending],["Approved", stats.approved],["Rejected / removed", stats.rejected],["Downloads", stats.downloads],["Open reports", stats.reports]].map(([label,value])=><div className="stat" key={label}><span>{label}</span><b>{value}</b></div>)}</div>:<div className="notice error">Live database statistics are unavailable. Check the Supabase server configuration.</div>}
    {!pending.length ? <div className="empty">No pending submissions right now.{stats.total === 0 ? " Configure Supabase, apply the migration, and seed the catalogue to begin." : ""}</div> : <div className="table-wrap"><table className="admin-table"><thead><tr><th>Resource</th><th>Reference</th><th>Branch / subject</th><th>Submitted</th><th>Review</th></tr></thead><tbody>{pending.map((r)=><tr key={r.id}><td><Link className="text-link" href={`/admin/review/${r.id}`}>{r.title}</Link><br/><span className="muted">{r.resource_type} · semester {r.semester}</span></td><td>{r.submission_reference}</td><td>{r.branches?.name}<br/>{r.subjects?.name}</td><td>{new Date(r.created_at).toLocaleDateString()}</td><td><ModerationActions id={r.id}/></td></tr>)}</tbody></table></div>}
    <h2 style={{ marginTop: 38 }}>Approved resources</h2>{!approved.length?<div className="empty">No approved resources yet.</div>:<div className="table-wrap"><table className="admin-table"><thead><tr><th>Resource</th><th>Reference</th><th>Type</th><th>Approved</th><th>Action</th></tr></thead><tbody>{approved.map((r)=><tr key={r.id}><td><Link className="text-link" href={`/admin/review/${r.id}`}>{r.title}</Link></td><td>{r.submission_reference}</td><td>{r.resource_type}</td><td>{new Date(r.created_at).toLocaleDateString()}</td><td><ModerationActions id={r.id} showRemoval/></td></tr>)}</tbody></table></div>}
  </div></main>;
}
