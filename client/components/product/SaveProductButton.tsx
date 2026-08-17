"use client";

import { SaveButton } from "@/components/ui/SaveButton";
import { useSavedProducts } from "@/lib/hooks/useSavedProducts";

type SaveProductButtonProps = {
  readonly productId: number;
  readonly productName: string;
  readonly variant?: "icon" | "wide";
};

/** 서버 컴포넌트인 상세 화면에서 저장 상태만 클라이언트로 떼어낸다. */
export function SaveProductButton({ productId, productName, variant = "wide" }: SaveProductButtonProps) {
  const { isSaved, toggle } = useSavedProducts();

  return (
    <SaveButton
      productName={productName}
      saved={isSaved(productId)}
      onToggle={() => toggle(productId)}
      variant={variant}
    />
  );
}
