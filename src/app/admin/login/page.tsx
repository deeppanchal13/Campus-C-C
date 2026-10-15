import { Footer, SiteNav } from "@/components/site-nav";
import { LoginForm } from "@/components/admin-forms";
export default function AdminLogin() { return <><SiteNav/><main className="page"><div className="admin-wrap"><h1 className="page-title">Admin access</h1><p className="page-lead">Sign in to review submissions and manage the catalogue.</p><LoginForm/></div></main><Footer/></>; }
