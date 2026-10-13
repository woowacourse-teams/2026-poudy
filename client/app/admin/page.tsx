import type { Metadata } from "next";

import { AdminScreen } from "@/components/admin/AdminScreen";

export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export default function AdminPage() {
  return <AdminScreen />;
}
