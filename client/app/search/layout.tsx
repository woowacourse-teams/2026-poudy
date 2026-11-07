import { SearchShell } from "@/components/search/SearchShell";

/** 제품명 탭과 성분 탭이 함께 쓰는 머리(상단 내비 · 검색 모드 탭). */
export default function SearchLayout({ children }: { readonly children: React.ReactNode }) {
  return <SearchShell>{children}</SearchShell>;
}
