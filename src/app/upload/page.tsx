import { Footer, SiteNav } from "@/components/site-nav";
import { UploadForm } from "@/components/upload-form";
export default function UploadPage() { return <><SiteNav/><main className="page"><div className="shell upload-layout"><h1 className="page-title">Share a resource</h1><p className="page-lead">Help your campus learn together. Submissions are reviewed before they appear publicly.</p><UploadForm/></div></main><Footer/></>; }
