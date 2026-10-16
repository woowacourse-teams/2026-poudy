import { EmptyState } from "@poudy/design-system/empty-state";

/**
 * 조건 일치 제품(/products)의 결과가 0개일 때.
 * Next 의 파일 규칙은 아니고, not-found.tsx 처럼 경로를 보고 찾을 수 있게 경로 옆에 둔다.
 * 문구와 행동은 화면 개편 때 명세(FEEDBACK F03 '조건이 너무 좁음', S51e)대로 채운다.
 */
export function ProductsEmpty() {
  return <EmptyState title="조건에 맞는 제품이 없어요" />;
}
