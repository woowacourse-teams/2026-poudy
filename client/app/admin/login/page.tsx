import type { Metadata } from "next";

import { AdminLoginScreen } from "@/components/admin/AdminLoginScreen";

export const metadata: Metadata = {
  title: "관리자 로그인",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

type Props = {
  readonly searchParams: Promise<{ readonly next?: string | string[] }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return <AdminLoginScreen returnToSwagger={next === "/api/admin/swagger-ui.html"} />;
}
