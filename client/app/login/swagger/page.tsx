import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SwaggerLoginRedirect } from "@/components/login/SwaggerLoginRedirect";

export const metadata: Metadata = {
  title: "Swagger 사용자 로그인",
  robots: { index: false, follow: false },
};

type Props = {
  readonly searchParams: Promise<{ readonly provider?: string | string[]; readonly popup?: string | string[] }>;
};

export default async function SwaggerLoginPage({ searchParams }: Props) {
  const { provider, popup } = await searchParams;
  if (provider !== "kakao" && provider !== "google") notFound();
  return <SwaggerLoginRedirect provider={provider} popup={popup === "1"} />;
}
