import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/icons/Icon";
import { TopBar } from "@/components/ui/TopBar";

export const metadata: Metadata = {
  title: "찾을 수 없는 화면",
};

/**
 * notFound() 를 부른 화면과 주소가 없는 화면이 함께 온다.
 * 제품·브랜드·성분 상세가 404 를 받으면 이 화면을 보여 준다.
 */
export default function NotFound() {
  return (
    <>
      <TopBar title="찾을 수 없어요" variant="sub" />

      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-14">
        <Icon name="search" size={28} className="text-text-secondary" />
        <p className="text-[15px] font-bold text-text-primary">찾는 화면이 없어요</p>
        <p className="text-center text-[12px] text-text-secondary">
          주소가 바뀌었거나 지워진 화면이에요. 다른 제품을 찾아보세요.
        </p>

        <Link
          href="/search/products"
          className="mt-2 flex h-11 items-center rounded-button border border-border px-5 text-[14px] font-bold text-text-primary"
        >
          제품 검색하기
        </Link>
      </main>
    </>
  );
}
