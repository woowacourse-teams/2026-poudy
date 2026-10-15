import { EmptyState } from "@poudy/design-system/empty-state";
import Image from "next/image";

/**
 * 위시리스트가 비었을 때(S55d-1). 처음이라 비어 있는 화면이라 일러스트 하나를 세운다(FEEDBACK F03).
 * Next 의 파일 규칙은 아니고, not-found.tsx 처럼 경로를 보고 찾을 수 있게 경로 옆에 둔다.
 */
export function WishlistEmpty() {
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
      title="아직 저장한 제품이 없어요"
      className="flex-1"
    />
  );
}
