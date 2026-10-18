"use client";

import type { TopBarBack } from "@poudy/design-system/top-bar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { hasInSiteHistory } from "@/lib/navigation/history-depth";

/* 방문 기록은 스스로 알려 오지 않는다. 그릴 때마다 그때의 기록을 읽는다. */
const subscribe = () => () => {};
const browserToHome = () => !hasInSiteHistory();
/* 서버에는 방문 기록이 없다. 미리 만든 화면은 기록이 있는 쪽으로 그린다. */
const serverToHome = () => false;

/**
 * 하위 상단 내비(TopBar sub)의 뒤로가기. 사이트 안에서 온 기록이 있으면 이전 화면으로 돌아가고,
 * 소셜 로그인처럼 밖에서 바로 들어왔으면 '홈으로' 링크가 된다. 정해진 주소로 가는 일이라 역할도 링크다.
 */
export function useSubScreenBack(): TopBarBack {
  const router = useRouter();
  const toHome = useSyncExternalStore(subscribe, browserToHome, serverToHome);

  if (toHome) return { asChild: <Link href="/" replace />, label: "홈으로" };

  return {
    // 한 화면에 머무는 동안 기록이 늘 수 있어 누르는 순간 다시 살핀다.
    onClick: () => {
      if (hasInSiteHistory()) {
        router.back();
        return;
      }
      router.replace("/");
    },
  };
}
