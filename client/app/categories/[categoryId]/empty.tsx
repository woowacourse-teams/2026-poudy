import { DirectoryProductsEmpty } from "@/components/directory/DirectoryProductsEmpty";

/**
 * 카테고리에서 고른 조건의 제품이 0개일 때(FEEDBACK F03, S51e).
 * Next 의 파일 규칙은 아니고, not-found.tsx 처럼 경로를 보고 찾을 수 있게 경로 옆에 둔다.
 */
export function CategoryProductsEmpty({ categoryId }: { readonly categoryId: number }) {
  return (
    <DirectoryProductsEmpty
      basePath={`/categories/${categoryId}`}
      noun="카테고리"
      icon="grid"
      directory={{ href: "/categories", label: "카테고리 전체 보기" }}
    />
  );
}
