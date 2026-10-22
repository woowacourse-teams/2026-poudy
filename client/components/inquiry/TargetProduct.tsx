import { ProductImage } from "@/components/ui/ProductImage";

/**
 * 정정 대상 제품(명세 S40e). 사용자가 바꿀 수 없으므로 누를 수 있게 보이지 않아야 한다. 테두리나 화살표를 두지 않는다.
 */
export function TargetProduct({
  brandName,
  productName,
  imageUrl,
}: {
  readonly brandName: string;
  readonly productName: string;
  readonly imageUrl: string;
}) {
  return (
    <section aria-label="정정할 제품" className="flex items-center gap-3 rounded-lg bg-surface p-3">
      {/* 썸네일 행의 칸 48(IMAGE P02). 옆에 제품명이 있어 대체 텍스트는 비운다(A11Y D05). */}
      <ProductImage src={imageUrl} size={48} className="shrink-0" />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-caption font-medium text-text-secondary">{brandName}</span>
        {/* 제품명은 길어질 수 있어 줄을 바꿔 다 보여 준다. 정정할 대상을 잘라서 보이면 맞는 제품인지 알 수 없다. */}
        <span className="text-title font-semibold break-keep text-text-primary">{productName}</span>
      </span>
    </section>
  );
}
