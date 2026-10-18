"use client";

import { TopBar, type TopBarTextAction } from "@poudy/design-system/top-bar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { hasInSiteHistory } from "@/lib/navigation/history-depth";

const subscribe = () => () => {};
const serverSnapshot = () => false;

type SearchTopBarProps = {
  /** 내비 오른쪽의 글자 버튼. 조건이 있을 때의 '초기화'다. */
  readonly action?: TopBarTextAction;
};

/**
 * 탐색 조건 화면의 상단 내비(명세 APP · 상단 내비 · 하위). 방문 기록이 없으면 꺾쇠가 홈으로 가는 링크가 된다.
 * 기록은 브라우저에만 있어 서버는 기록이 있는 쪽으로 그리고, 붙은 뒤에 실제 기록을 본다.
 */
export function SearchTopBar({ action }: SearchTopBarProps) {
  const router = useRouter();
  const toHome = useSyncExternalStore(subscribe, () => !hasInSiteHistory(), serverSnapshot);

  return (
    <TopBar
      variant="sub"
      title="탐색 조건 설정"
      back={
        toHome
          ? { asChild: <Link href="/" replace />, label: "홈으로" }
          : {
              onClick: () => {
                // 한 화면에 머무는 동안 기록이 늘 수 있어 누르는 순간 다시 살핀다.
                if (hasInSiteHistory()) router.back();
                else router.replace("/");
              },
            }
      }
      action={action}
    />
  );
}
