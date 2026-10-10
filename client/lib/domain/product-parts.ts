import { keepIf } from "./optional";

import type { ProductEntryPoint } from "@/lib/analytics/events";

/** 구성품 탭의 id. 탭 패널이 이 id 로 제 이름을 단다. 서버 컴포넌트인 패널도 부르므로 클라이언트 파일 밖에 둔다. */
export const partTabId = (partId: number): string => `part-tab-${partId}`;

// URLSearchParams 생성자가 변경 가능한 배열을 요구해서 readonly 튜플을 쓰지 않는다.
type Entry = [string, string];

/** 구성품을 고른 주소. 진입 경로를 이어 붙여 탭을 바꿔도 조회 이벤트가 다시 나가지 않게 한다. */
export const partHref = (productId: number, partId: number, entryPoint: ProductEntryPoint): string => {
  const query = new URLSearchParams([
    ["partId", String(partId)],
    ...keepIf<Entry>(entryPoint !== "direct", ["from", entryPoint]),
  ]);
  return `/products/${productId}?${query}`;
};
