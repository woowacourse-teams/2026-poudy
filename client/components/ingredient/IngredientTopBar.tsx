"use client";

import { useToast } from "@poudy/design-system/toast";

import { SubTopBar } from "@/components/navigation/SubTopBar";
import { requestSelectionHaptic } from "@/lib/interaction/haptic";
import { sharePage } from "@/lib/interaction/share";

type IngredientTopBarProps = {
  /** 바 제목. '성분 설명', '성분군 설명' */
  readonly title: string;
  /**
   * 공유할 대상의 이름. 공유 버튼의 이름이 '{이름} 공유'가 된다(A11Y D05).
   * 없는 성분 화면처럼 공유할 것이 없으면 넘기지 않는다.
   */
  readonly shareName?: string;
  /**
   * 바 제목을 문서의 대표 제목으로 둘지. 본문의 성분 이름이 진짜 제목인 화면은 기본값 p 로 내린다.
   * 본문에 제목이 없는 없는 성분 화면은 h1 로 둔다.
   */
  readonly titleAs?: "h1" | "p";
};

/**
 * 성분 설명·성분군 설명의 상단 내비(명세 APP · 상단 내비 · 하위).
 *
 * 뒤로가기는 다른 하위 화면과 같이 SubTopBar(useSubScreenBack)가 맡고, 이 부품은 공유 행동만 더한다.
 *
 * 공유: 앱과 Web Share API 는 시스템 화면이 결과를 알린다. 주소 복사로 끝났을 때만 토스트로 알린다(FEEDBACK F04).
 */
export function IngredientTopBar({ title, shareName, titleAs = "p" }: IngredientTopBarProps) {
  const toast = useToast();

  const handleShare = async () => {
    requestSelectionHaptic();
    const result = await sharePage(window.location.href);
    // 옛 앱은 복사로 돌려도 시스템이 안내를 띄운다. 겹치지 않게 웹에서만 알린다.
    if (result === "copied" && !window.ReactNativeWebView) toast.show({ message: "주소를 복사했어요" });
  };

  return (
    <SubTopBar
      title={title}
      titleAs={titleAs}
      action={shareName ? { icon: "share", label: `${shareName} 공유`, onClick: handleShare } : undefined}
    />
  );
}
