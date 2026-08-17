"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { type PageName } from "@/lib/analytics/events";
import { initAnalytics, track } from "@/lib/analytics/track";

/** 경로에서 화면 이름을 정한다. 화면마다 호출을 심지 않아도 되게 한다. */
const pageOf = (pathname: string): PageName | undefined => {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/search")) return "search";
  if (/^\/products\/[^/]+$/.test(pathname)) return "product_detail";
  if (pathname.startsWith("/products")) return "product_list";
  if (pathname.startsWith("/ingredients/")) return "ingredient_detail";
  if (pathname.startsWith("/saved")) return "saved";
  if (pathname.startsWith("/categories")) return "category";
  if (pathname.startsWith("/brands")) return "brand";
  return undefined;
};

/**
 * App Router 는 라우트가 바뀌어도 문서를 다시 읽지 않는다.
 * 자동 수집을 끄고 경로가 바뀔 때마다 직접 기록한다.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    void initAnalytics();
  }, []);

  useEffect(() => {
    const page = pageOf(pathname);
    if (page) track("page_viewed", { page });
  }, [pathname]);

  return null;
}
