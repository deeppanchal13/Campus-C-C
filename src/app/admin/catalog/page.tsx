import { CatalogManager } from "@/components/catalog-manager";
import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
export default async function AdminCatalog() { if (!await isAdmin()) redirect("/admin/login"); return <main className="page"><div className="shell"><h1 className="page-title">Academic catalogue</h1><p className="page-lead">Add branches and subjects. Starter entries are editable seed examples, not an official syllabus.</p><CatalogManager/></div></main>; }
