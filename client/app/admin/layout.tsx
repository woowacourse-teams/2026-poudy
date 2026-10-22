import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = { robots: { index: false, follow: false }, openGraph: null, twitter: null };
export default function AdminLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
