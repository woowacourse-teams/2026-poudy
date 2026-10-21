import { keepIf } from "./optional";

import type { ProductEntryPoint } from "@/lib/analytics/events";

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

/** 구성품의 순서 표기. 탭과 칩이 이름 앞에 두 자리로 붙인다(01, 02 …). 응답에 따로 이름 붙은 순서가 없어 차례로 센다. */
export const partOrder = (index: number): string => String(index + 1).padStart(2, "0");
