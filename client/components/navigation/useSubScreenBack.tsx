"use client";

import type { TopBarBack } from "@poudy/design-system/top-bar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { hasInSiteHistory } from "@/lib/navigation/history-depth";

/** 사이트 안에서 온 기록이 없을 때 뒤로가기 대신 갈 곳과 그때의 이름 */
export type SubScreenFallback = { readonly href: string; readonly label: string };

const HOME: SubScreenFallback = { href: "/", label: "홈으로" };

/* 방문 기록은 스스로 알려 오지 않는다. 그릴 때마다 그때의 기록을 읽는다. */
const subscribe = () => () => {};
/* 서버에는 방문 기록이 없다. 미리 만든 화면은 기록이 있는 쪽으로 그린다. */
const serverHasHistory = () => true;

/**
 * 상단 내비(TopBar sub · explore)의 뒤로가기. 사이트 안에서 온 기록이 있으면 이전 화면으로 돌아가고,
 * 소셜 로그인이나 공유 링크처럼 밖에서 바로 들어왔으면 fallback(기본은 홈)으로 가는 링크가 된다.
 * 정해진 주소로 가는 일이라 역할도 링크이고, 이름도 그 일에 맞게 바꾼다. 기록은 브라우저에만 있어 붙은 뒤에 바뀐다.
 * 그림은 같은 꺾쇠라 바뀌어도 깜빡이지 않는다.
 */
export function useSubScreenBack(fallback: SubScreenFallback = HOME): TopBarBack {
  const router = useRouter();
  const hasHistory = useSyncExternalStore(subscribe, hasInSiteHistory, serverHasHistory);

  // 기록을 늘리지 않도록 지금 화면을 대신한다.
  if (!hasHistory) return { asChild: <Link href={fallback.href} replace />, label: fallback.label };

  return {
    // 한 화면에 머무는 동안 기록이 늘 수 있어 누르는 순간 다시 살핀다.
    onClick: () => {
      if (hasInSiteHistory()) {
        router.back();
        return;
      }
      router.replace(fallback.href);
    },
  };
}
