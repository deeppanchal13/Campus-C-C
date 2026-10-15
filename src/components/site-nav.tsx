import Link from "next/link";

export function SiteNav() {
  return <header className="topbar"><div className="shell nav"><Link className="brand" href="/"><span className="brand-mark">CV</span>CampusVault</Link><nav className="nav-links"><Link href="/resources">Explore Resources</Link><Link href="/subjects">Subjects</Link><Link href="/#how">How It Works</Link><Link href="/admin/login">Admin</Link></nav><Link className="nav-cta" href="/upload">Upload Resource <span>↗</span></Link></div></header>;
}

export function Footer() {
  return <footer className="footer"><div className="shell footer-inner"><span>© {new Date().getFullYear()} CampusVault · Built for campus learning</span><div className="footer-links"><Link href="/resources">Explore</Link><Link href="/upload">Contribute</Link><Link href="/admin/login">Admin</Link></div></div></footer>;
}
