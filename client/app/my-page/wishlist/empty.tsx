"use client";

import { Button } from "@poudy/design-system/button";
import { EmptyState } from "@poudy/design-system/empty-state";
import { Icon } from "@poudy/design-system/icon";
import { useRouter } from "next/navigation";

/**
 * 위시리스트가 비었을 때(S55d-1). 화면 오류(S51)와 같은 틀로 아이콘 · 제목 · 설명 · 행동 하나를 가운데에 둔다(FEEDBACK F03).
 * 아이콘은 제품 상세의 위시리스트 추가 버튼과 같은 하트다.
 * Next 의 파일 규칙은 아니고, not-found.tsx 처럼 경로를 보고 찾을 수 있게 경로 옆에 둔다.
 */
export function WishlistEmpty() {
  const router = useRouter();

  return (
    <EmptyState
      icon={<Icon name="heart" size={28} />}
      title="아직 위시리스트에 추가한 제품이 없어요"
      description={"제품 상세에서 위시리스트 추가 버튼을 누르면\n여기에서 모아 볼 수 있어요"}
      action={
        <Button variant="secondary" onClick={() => router.push("/search/products")}>
          제품 둘러보기
        </Button>
      }
      className="flex-1"
    />
  );
}
