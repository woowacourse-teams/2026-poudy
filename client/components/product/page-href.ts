import { type Filter, serializeFilter } from "@/lib/domain/filter";

/**
 * 같은 조건의 다른 장 주소. 1 페이지는 `page` 를 남기지 않는다.
 * 크롤러는 스크롤하지 않으므로 이 주소를 따라가야 뒤쪽 장의 제품에 닿는다.
 */
export const pageHref = (basePath: string, filter: Filter, page: number): string => {
  const query = serializeFilter({ ...filter, page }).toString();
  if (!query) return basePath;
  return `${basePath}?${query}`;
};
