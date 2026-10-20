"use client";

import { TopBar } from "@poudy/design-system/top-bar";
import type { ReactNode } from "react";

import { type SubScreenFallback, useSubScreenBack } from "@/components/navigation/useSubScreenBack";

type DirectoryTopBarProps = {
  readonly title: ReactNode;
  /** 카테고리 경로 맥락이면 왼쪽(start), 브랜드처럼 그 밖이면 가운데(center)다(명세 S28·S30). */
  readonly align: "start" | "center";
  /** 본문에 대표 제목이 있는 화면은 p 로 내린다. */
  readonly titleAs?: "h1" | "p";
  /** 이 사이트 안의 방문 기록이 없을 때 뒤로가기 대신 갈 디렉터리. */
  readonly fallback: SubScreenFallback;
};

/**
 * 카테고리 상품·브랜드 상세의 탐색 앱바(TopBar explore, 높이 56).
 *
 * 밖에서 바로 들어와 돌아갈 화면이 없으면, 뒤로가기 자리는 상위 디렉터리로 가는 링크가 된다(useSubScreenBack).
 *
 * 바 아래 선은 앱바 바로 아래에 붙는 필터 칩 줄이 맡는다. 둘 다 그으면 선이 두 줄 생긴다.
 */
export function DirectoryTopBar({ title, align, titleAs = "h1", fallback }: DirectoryTopBarProps) {
  const back = useSubScreenBack(fallback);

  return <TopBar variant="explore" align={align} title={title} titleAs={titleAs} edge={false} back={back} />;
}
