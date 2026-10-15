import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "CampusVault — Your Campus Resources. One Smart Vault.", description: "Discover and share academic resources with your campus community." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
