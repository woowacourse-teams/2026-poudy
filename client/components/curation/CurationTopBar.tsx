"use client";

import { useToast } from "@poudy/design-system/toast";
import { TopBar } from "@poudy/design-system/top-bar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { requestSelectionHaptic } from "@/lib/interaction/haptic";
import { sharePage } from "@/lib/interaction/share";
import { hasInSiteHistory } from "@/lib/navigation/history-depth";

/* 방문 기록은 스스로 알려 오지 않는다. 그릴 때마다 그때의 기록을 읽는다. */
const subscribe = () => () => {};

/* 서버에는 방문 기록이 없다. 미리 만든 화면은 기록이 있는 쪽으로 그린다. */
const serverSnapshot = () => false;

/**
 * 큐레이션 상세의 상단 내비(명세 APP · 상단 내비 · 하위 ZdlT8). 뒤로가기 · 기획전 제목 · 공유다.
 *
 * 공유 링크로 바로 들어와 사이트 안의 방문 기록이 없으면, 뒤로가기 자리에 홈으로 가는 링크가 선다. 정해진 주소로 가는
 * 일이라 이름도 '홈으로'다(A11Y D05). 그림은 바꾸지 않는다. 바꾸면 이미 그려진 화면에서 꺾쇠가 뒤바뀌어 깜빡인다.
 *
 * 공유는 앱에서는 공유 시트를 열고, 웹에서는 주소를 복사한 뒤 토스트로 알린다(FEEDBACK F04).
 */
export function CurationTopBar({ title }: { readonly title: string }) {
  const router = useRouter();
  const { show } = useToast();
  const toHome = useSyncExternalStore(subscribe, () => !hasInSiteHistory(), serverSnapshot);

  const share = async () => {
    requestSelectionHaptic();
    const result = await sharePage(window.location.href);
    if (result === "copied" && !window.ReactNativeWebView) show({ message: "주소를 복사했어요" });
  };

  return (
    <TopBar
      variant="sub"
      title={title}
      back={
        toHome
          ? { asChild: <Link href="/" replace />, label: "홈으로" }
          : {
              onClick: () => {
                /* 한 화면에 머무는 동안 기록이 늘 수 있어 누르는 순간 다시 살핀다. */
                if (hasInSiteHistory()) router.back();
                else router.replace("/");
              },
            }
      }
      action={{ icon: "share", label: "공유하기", onClick: share }}
    />
  );
}
