import { DirectoryProductsEmpty } from "@/components/directory/DirectoryProductsEmpty";

/**
 * 브랜드 상세에서 고른 조건의 제품이 0개일 때(FEEDBACK F03, S51e).
 * Next 의 파일 규칙은 아니고, not-found.tsx 처럼 경로를 보고 찾을 수 있게 경로 옆에 둔다.
 */
export function BrandProductsEmpty({ brandId }: { readonly brandId: number }) {
  return (
    <DirectoryProductsEmpty
      basePath={`/brands/${brandId}`}
      noun="브랜드"
      directory={{ href: "/brands", label: "브랜드 전체 보기" }}
    />
  );
}
