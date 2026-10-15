"use client";

import { Button } from "@poudy/design-system/button";
import { EmptyState } from "@poudy/design-system/empty-state";
import Image from "next/image";
import { useRouter } from "next/navigation";

/**
 * 위시리스트가 비었을 때(S55d-1). 처음이라 비어 있는 화면이라 일러스트 하나를 세운다(FEEDBACK F03).
 * Next 의 파일 규칙은 아니고, not-found.tsx 처럼 경로를 보고 찾을 수 있게 경로 옆에 둔다.
 */
export function WishlistEmpty() {
  const router = useRouter();

  return (
    <EmptyState
      image={
        /*
         * 그리는 크기(170)의 두 배를 적는다. next/image 는 1 배와 2 배 사본만 만들어,
         * 그대로 적으면 3 배 화면이 작은 사본을 늘려 쓰며 가장자리가 뭉갠다.
         */
        <Image
          src="/images/empty-states/no-saved-products-watermark.png"
          alt=""
          width={340}
          height={340}
          loading="eager"
          className="size-full"
        />
      }
      title="아직 위시리스트에 추가한 제품이 없어요"
      description={"제품 상세에서 위시리스트 추가 버튼을 누르면\n여기에서 모아 볼 수 있어요."}
      action={
        <Button variant="secondary" onClick={() => router.push("/search/products")}>
          제품 둘러보기
        </Button>
      }
      className="flex-1"
    />
  );
}
