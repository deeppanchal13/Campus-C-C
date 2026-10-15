import { ReportsManager } from "@/components/reports-manager";
import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
export default async function ReportsPage(){if(!await isAdmin())redirect("/admin/login");return <main className="page"><div className="shell"><h1 className="page-title">Reports & audit</h1><p className="page-lead">Review community reports and inspect administrative actions.</p><ReportsManager/></div></main>}
