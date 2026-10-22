"use client";

import { useToast } from "@poudy/design-system/toast";
import { TopBar } from "@poudy/design-system/top-bar";

import { useSummaryPassed } from "./ProductScrollState";

import { useSubScreenBack } from "@/components/navigation/useSubScreenBack";
import { ProductImage } from "@/components/ui/ProductImage";
import { requestSelectionHaptic } from "@/lib/interaction/haptic";
import { sharePage } from "@/lib/interaction/share";

/**
 * 제품 상세의 하위 상단 내비. 오른쪽에 공유 버튼 하나를 둔다.
 *
 * 본문의 제품명이 내비 아래로 지나가면 제목 자리를 제품 사진(28)과 제품명으로 바꾼다(S24-1). 이름이 길면 한 줄로 줄인다.
 * 문서의 대표 제목은 본문의 제품명이 맡으므로 내비 제목은 p 로 둔다.
 */
export function ProductTopBar({ name, imageUrl }: { readonly name: string; readonly imageUrl: string }) {
  const back = useSubScreenBack();
  const summaryPassed = useSummaryPassed();
  const toast = useToast();

  const share = async () => {
    requestSelectionHaptic();
    const result = await sharePage(window.location.href);
    // 앱은 주소를 복사하면 스스로 알린다. 브라우저에서 복사로 끝났을 때만 알린다.
    if (result === "copied" && !window.ReactNativeWebView) toast.show({ message: "주소를 복사했어요" });
  };

  return (
    <TopBar
      variant="sub"
      title="제품 상세"
      titleAs="p"
      back={back}
      action={{ icon: "share", label: "제품 공유", onClick: () => void share() }}
      titleSwap={{
        active: summaryPassed,
        content: (
          <span className="flex min-w-0 items-center gap-2">
            <ProductImage src={imageUrl} size={28} loading="lazy" className="shrink-0" />
            <span className="min-w-0 truncate text-body leading-snug font-semibold text-text-primary">{name}</span>
          </span>
        ),
      }}
    />
  );
}
