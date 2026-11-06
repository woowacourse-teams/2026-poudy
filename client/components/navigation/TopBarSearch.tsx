"use client";

import { TopBarSearchProvider } from "@poudy/design-system/top-bar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { matchesPathSegment } from "@/components/ui/bottom-navigation-path";

/**
 * 모든 상단 내비의 오른쪽 끝에 검색 링크를 둔다. 탐색 탭을 빼면서 어디서든 검색으로 갈 수 있게 바가 맡았다.
 * 검색 화면은 이미 검색 안이라 버튼이 갈 곳이 없어 넘기지 않는다.
 */
export function TopBarSearch({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const link = matchesPathSegment(pathname, "/search") ? null : <Link href="/search/products" />;

  return <TopBarSearchProvider link={link}>{children}</TopBarSearchProvider>;
}
