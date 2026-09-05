import type { ShareMatchResponse } from "@poudy/api/api.zod";

const PRODUCTS_PATH = "/products";

/**
 * 공유 매칭 결과를 앱이 이동할 경로로 옮긴다. 제품을 확정하면 상세로 보내고,
 * 확정하지 못했더라도 검색어가 남으면 목록에서 이어 찾게 한다. 둘 다 아니면
 * 보낼 곳이 없으므로 호출한 쪽이 안내 화면을 그린다.
 */
export const shareDestinationOf = (match: ShareMatchResponse): string | null => {
  if (match.status === "MATCHED" && typeof match.productId === "number") {
    return `${PRODUCTS_PATH}/${match.productId}`;
  }

  if (match.status === "NOT_FOUND" && match.keyword) {
    return `${PRODUCTS_PATH}?${new URLSearchParams({ keyword: match.keyword }).toString()}`;
  }

  return null;
};
