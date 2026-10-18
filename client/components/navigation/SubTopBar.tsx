"use client";

import { TopBar, type TopBarIconAction, type TopBarTextAction } from "@poudy/design-system/top-bar";

import { useSubScreenBack } from "./useSubScreenBack";

type SubTopBarProps = {
  readonly title: string;
  /** 본문에 진짜 제목이 있는 화면은 p 로 내린다. 모양은 그대로다. */
  readonly titleAs?: "h1" | "p";
  /** 스크롤하면 바 아래 선을 긋는다. 바로 아래에 선을 긋는 줄(탭 등)이 붙는 화면은 끈다. */
  readonly edge?: boolean;
  /** 내비 오른쪽의 행동. 글자 버튼(탐색 조건의 '초기화' 등)이나 아이콘 버튼이다. */
  readonly action?: TopBarIconAction | TopBarTextAction;
};

/**
 * 하위 화면의 상단 내비(명세 APP · 상단 내비 · 하위). 뒤로가기는 useSubScreenBack 이 맡는다.
 * 서버 컴포넌트 화면(약관 등)은 훅을 부를 수 없어 이 부품을 쓴다.
 */
export function SubTopBar({ title, titleAs, edge, action }: SubTopBarProps) {
  const back = useSubScreenBack();

  return <TopBar variant="sub" title={title} titleAs={titleAs} edge={edge} back={back} action={action} />;
}
