"use client";

import { useToast } from "@poudy/design-system/toast";
import { TopBar } from "@poudy/design-system/top-bar";

import { useSubScreenBack } from "@/components/navigation/useSubScreenBack";
import { requestSelectionHaptic } from "@/lib/interaction/haptic";
import { sharePage } from "@/lib/interaction/share";

/**
 * 큐레이션 상세의 상단 내비(명세 APP · 상단 내비 · 하위 ZdlT8). 뒤로가기 · 기획전 제목 · 공유다.
 *
 * 뒤로가기는 다른 하위 화면과 같이 useSubScreenBack 이 맡는다. 공유 링크로 바로 들어와 사이트 안의 방문 기록이 없으면,
 * 뒤로가기 자리에 홈으로 가는 링크가 서고 이름도 '홈으로'가 된다(A11Y D05).
 *
 * 공유는 앱에서는 공유 시트를 열고, 웹에서는 주소를 복사한 뒤 토스트로 알린다(FEEDBACK F04).
 */
export function CurationTopBar({ title }: { readonly title: string }) {
  const { show } = useToast();
  const back = useSubScreenBack();

  const share = async () => {
    requestSelectionHaptic();
    const result = await sharePage(window.location.href);
    if (result === "copied" && !window.ReactNativeWebView) show({ message: "주소를 복사했어요" });
  };

  return (
    <TopBar variant="sub" title={title} back={back} action={{ icon: "share", label: "공유하기", onClick: share }} />
  );
}
