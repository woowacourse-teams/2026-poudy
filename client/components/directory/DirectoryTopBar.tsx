"use client";

import { TopBar } from "@poudy/design-system/top-bar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useSyncExternalStore } from "react";

import { hasInSiteHistory } from "@/lib/navigation/history-depth";

/* 방문 기록은 스스로 알려 오지 않는다. 그릴 때마다 그때의 기록을 읽는다. */
const subscribe = () => () => {};

/* 서버에는 방문 기록이 없다. 미리 그린 화면은 기록이 있는 쪽으로 그린다. */
const serverSnapshot = () => true;

type DirectoryTopBarProps = {
  readonly title: ReactNode;
  /** 카테고리 경로 맥락이면 왼쪽(start), 브랜드처럼 그 밖이면 가운데(center)다(명세 S28·S30). */
  readonly align: "start" | "center";
  /** 본문에 대표 제목이 있는 화면은 p 로 내린다. */
  readonly titleAs?: "h1" | "p";
  /** 이 사이트 안의 방문 기록이 없을 때 뒤로가기 대신 갈 디렉터리. */
  readonly fallback: { readonly href: string; readonly label: string };
};

/**
 * 카테고리 상품·브랜드 상세의 탐색 앱바(TopBar explore, 높이 56).
 *
 * 밖에서 바로 들어와 돌아갈 화면이 없으면, 뒤로가기 자리는 상위 디렉터리로 가는 링크가 된다.
 * 이름도 그 일에 맞게 바꾼다. 기록은 브라우저에만 있으므로 붙은 뒤에 실제 기록을 보고 바꾼다.
 * 그림은 같은 꺾쇠라 바뀌어도 깜빡이지 않는다.
 *
 * 바 아래 선은 앱바 바로 아래에 붙는 필터 칩 줄이 맡는다. 둘 다 그으면 선이 두 줄 생긴다.
 */
export function DirectoryTopBar({ title, align, titleAs = "h1", fallback }: DirectoryTopBarProps) {
  const router = useRouter();
  const hasHistory = useSyncExternalStore(subscribe, hasInSiteHistory, serverSnapshot);

  const back = hasHistory
    ? {
        // 한 화면에 머무는 동안 기록이 늘 수 있어 누르는 순간 다시 살핀다.
        onClick: () => (hasInSiteHistory() ? router.back() : router.replace(fallback.href)),
      }
    : {
        // 기록을 늘리지 않도록 지금 화면을 대신한다.
        asChild: <Link href={fallback.href} replace />,
        label: fallback.label,
      };

  return <TopBar variant="explore" align={align} title={title} titleAs={titleAs} edge={false} back={back} />;
}
