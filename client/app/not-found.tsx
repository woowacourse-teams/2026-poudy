import { ErrorState } from "@poudy/design-system/error-state";
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

      <main className="flex flex-1 flex-col">
        <ErrorState
          variant="screen"
          icon={<Icon name="search" size={28} />}
          title="찾는 화면이 없어요"
          description="주소가 바뀌었거나 지워진 화면이에요. 다른 제품을 찾아보세요."
          action={
            /*
             * 다른 화면으로 가는 행동이라 버튼이 아니라 링크로 둔다. 패키지 Button 은 링크로 그릴 수 없어 BTN · Secondary 의
             * 모양만 옮겼다. 링크 부품이 생기면 그것으로 바꾼다.
             */
            <Link
              href="/search/products"
              className="flex h-12 items-center rounded-xl bg-button-secondary px-4 text-14 leading-none font-semibold text-text-primary"
            >
              제품 검색하기
            </Link>
          }
          className="flex-1"
        />
      </main>
    </>
  );
}
