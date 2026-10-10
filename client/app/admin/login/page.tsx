import type { Metadata } from "next";

import { AdminLoginScreen } from "@/components/admin/AdminLoginScreen";

export const metadata: Metadata = {
  title: "관리자 로그인",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export default function AdminLoginPage() {
  return <AdminLoginScreen />;
}
