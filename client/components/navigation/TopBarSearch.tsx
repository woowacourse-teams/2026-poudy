"use client";

import { TopBarSearchProvider } from "@poudy/design-system/top-bar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { isProductDetailPath, matchesPathSegment } from "@/components/ui/bottom-navigation-path";

/**
 * 제품을 찾는 화면에서만 상단 내비의 오른쪽 끝에 검색 링크를 둔다(NAV 노출 기준).
 * 홈 · 제품 상세 · 조건 일치 제품 · 카테고리 탭(카테고리 · 브랜드 디렉터리와 그 아래 제품 목록)이 여기에 해당한다.
 * 조건 일치 제품과 카테고리 탭은 확인 중이다(2026-11-16 회의는 카테고리, 사용자 메모는 조건 일치 제품).
 * 루틴 · 마이페이지 · 파우치처럼 그 화면 안에서 검색하는 버튼으로 오해하기 쉬운 화면에서는 넘기지 않는다.
 * 홈은 머리(HomeTopBar)가 링크를 따로 그리고, 여기서는 홈의 오류 화면처럼 TopBar 를 쓰는 경우를 맡는다.
 */
export const showsTopBarSearch = (pathname: string): boolean =>
  pathname === "/" ||
  pathname === "/products" ||
  isProductDetailPath(pathname) ||
  matchesPathSegment(pathname, "/categories") ||
  matchesPathSegment(pathname, "/brands");

export function TopBarSearch({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const link = showsTopBarSearch(pathname) ? <Link href="/search/products" /> : null;

  return <TopBarSearchProvider link={link}>{children}</TopBarSearchProvider>;
}
