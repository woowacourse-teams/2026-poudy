import { notFound } from "next/navigation";

import { fetchProducts } from "@/lib/api/products";
import type { Filter } from "@/lib/domain/filter";

/**
 * 마지막 장을 넘어선 주소는 404 로 끝낸다. 빈 목록을 200 으로 주면 검색 엔진이 소프트 404 로 본다.
 *
 * 상태 코드는 응답의 첫 바이트와 함께 나가므로, 스트리밍하지 않는 뒤쪽 장에서 그리기 전에 부른다.
 * 같은 요청 안에서 목록이 부르는 조회와 겹쳐 API 는 한 번만 불린다. 받지 못하면 판단하지 않고
 * 목록에 맡긴다.
 */
export const requireProductPage = async (filter: Filter): Promise<void> => {
  const response = await fetchProducts(filter).catch(() => undefined);
  if (response && filter.page > response.pagination.totalPages) notFound();
};
