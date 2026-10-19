"use client";

import type { TopBarBack } from "@poudy/design-system/top-bar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { hasInSiteHistory } from "@/lib/navigation/history-depth";

/* 방문 기록은 스스로 알려 오지 않는다. 그릴 때마다 그때의 기록을 읽는다. */
const subscribe = () => () => {};

/* 서버에는 방문 기록이 없다. 미리 만든 화면은 기록이 있는 쪽으로 그린다. */
const serverSnapshot = () => false;

/**
 * 하위 상단 내비(TopBar sub)의 뒤로가기. 옛 TopBar 의 BackControl 과 같은 판단을 패키지 TopBar 의 back 으로 넘긴다.
 *
 * 사이트 안의 방문 기록이 있으면 이전 화면으로 돌아간다. 밖에서 바로 들어와 기록이 없으면 홈으로 가는 링크를 세우고
 * 이름도 '홈으로'로 바꾼다. 정해진 주소로 가는 일이라 역할도 버튼이 아니라 링크다.
 * 미리 만든 화면은 기록이 있는 쪽으로 그리고, 붙은 뒤 실제 기록을 보고 바꾼다. 그림(꺾쇠)은 바꾸지 않는다.
 */
export const useTopBarBack = (): TopBarBack => {
  const router = useRouter();
  const toHome = useSyncExternalStore(subscribe, () => !hasInSiteHistory(), serverSnapshot);

  if (toHome) {
    // 기록을 늘리지 않도록 지금 화면을 대신한다.
    return { asChild: <Link href="/" replace />, label: "홈으로" };
  }

  return {
    // 한 화면에 머무는 동안 기록이 늘 수 있어 누르는 순간 다시 살핀다.
    onClick: () => (hasInSiteHistory() ? router.back() : router.replace("/")),
  };
};
