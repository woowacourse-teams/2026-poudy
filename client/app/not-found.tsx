import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import type { Metadata } from "next";

import { DirectoryLinkButton } from "@/components/directory/DirectoryLinkButton";
import { SubTopBar } from "@/components/navigation/SubTopBar";

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
      <SubTopBar title="찾을 수 없어요" />

      <main className="flex flex-1 flex-col">
        <ErrorState
          variant="screen"
          icon={<Icon name="search" size={28} />}
          title="찾는 화면이 없어요"
          description="주소가 바뀌었거나 지워진 화면이에요. 다른 제품을 찾아보세요."
          action={
            /*
             * 다른 화면으로 가는 행동이라 버튼이 아니라 링크로 둔다. BTN · Secondary 의 모양과 누름 상태(hover·눌림)를
             * 함께 옮긴 링크 부품을 쓴다(STATE S01·S08).
             */
            <DirectoryLinkButton href="/search/products">제품 검색하기</DirectoryLinkButton>
          }
          className="flex-1"
        />
      </main>
    </>
  );
}
