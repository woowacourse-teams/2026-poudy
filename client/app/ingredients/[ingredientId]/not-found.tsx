import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import type { Metadata } from "next";

import { SecondaryLink } from "@/components/ingredient/IngredientLinks";
import { IngredientTopBar } from "@/components/ingredient/IngredientTopBar";

export const metadata: Metadata = {
  title: "찾을 수 없는 성분",
};

/**
 * S51h 없는 성분. 성분 설명이 404 를 받거나 주소의 번호가 숫자가 아니면 이 화면을 보여 준다.
 * 상단 내비와 하단 내비는 남겨 다른 곳으로 갈 수 있게 하고, 본문에는 아이콘 · 문구 · 행동 하나를 둔다(#732).
 */
export default function IngredientNotFound() {
  return (
    <>
      <IngredientTopBar title="성분 설명" titleAs="h1" />

      <main className="flex flex-1 flex-col">
        <ErrorState
          variant="screen"
          icon={<Icon name="flask-conical" size={28} />}
          title="꾹 짜 봐도 나오지 않는 성분이에요"
          description={"아직 정리 중이거나 주소가 바뀐 성분이에요.\n성분 이름으로 다시 찾아봐요."}
          action={<SecondaryLink href="/search/ingredients">성분 검색하기</SecondaryLink>}
          className="flex-1"
        />
      </main>
    </>
  );
}
