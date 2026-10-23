"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { startServiceActiveTime } from "./service-active-time";

import { afterAnalyticsReady } from "@/lib/analytics/deferred-posthog";
import { HOME_PAGE_VERSION, type PageName } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

/** 경로에서 화면 이름을 정한다. 화면마다 호출을 심지 않아도 되게 한다. */
export const pageOf = (pathname: string): PageName | undefined => {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/search")) return "search";
  if (/^\/products\/[^/]+$/.test(pathname)) return "product_detail";
  if (pathname.startsWith("/products")) return "product_list";
  if (pathname.startsWith("/ingredients/")) return "ingredient_detail";
  if (pathname.startsWith("/ingredient-groups/")) return "ingredient_group_detail";
  if (pathname.startsWith("/my-page/wishlist")) return "saved";
  if (pathname.startsWith("/categories")) return "category";
  if (pathname.startsWith("/brands")) return "brand";
  if (/^\/curations\/[^/]+$/.test(pathname)) return "curation_detail";
  if (pathname === "/about") return "about";
  return undefined;
};

/**
 * App Router 는 라우트가 바뀌어도 문서를 다시 읽지 않는다.
 * 경로가 바뀔 때마다 제품 화면 이름을 직접 기록한다.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const committedPathname = useRef(pathname);
  const tracker = useRef<ReturnType<typeof startServiceActiveTime> | undefined>(undefined);

  useEffect(() => {
    committedPathname.current = pathname;
    tracker.current?.navigate(pathname);
  }, [pathname]);

  useEffect(() => {
    const unsubscribe = afterAnalyticsReady((client) => {
      tracker.current?.stop();
      tracker.current = startServiceActiveTime(client, committedPathname.current);
    });
    return () => {
      unsubscribe();
      tracker.current?.stop();
      tracker.current = undefined;
    };
  }, []);

  useEffect(() => {
    const page = pageOf(pathname);
    if (page) track("page_viewed", page === "home" ? { page, page_version: HOME_PAGE_VERSION } : { page });
  }, [pathname]);

  return null;
}
