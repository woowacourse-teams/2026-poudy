"use client";

import { TopBar, type TopBarTextAction } from "@poudy/design-system/top-bar";

import { useSubScreenBack } from "./useSubScreenBack";

type SubTopBarProps = {
  readonly title: string;
  /** 본문에 진짜 제목이 있는 화면은 p 로 내린다. 모양은 그대로다. */
  readonly titleAs?: "h1" | "p";
  /** 내비 오른쪽의 글자 버튼(탐색 조건의 '초기화' 등) */
  readonly action?: TopBarTextAction;
};

/**
 * 하위 화면의 상단 내비(명세 APP · 상단 내비 · 하위). 뒤로가기는 useSubScreenBack 이 맡는다.
 * 서버 컴포넌트 화면(약관 등)은 훅을 부를 수 없어 이 부품을 쓴다.
 */
export function SubTopBar({ title, titleAs, action }: SubTopBarProps) {
  const back = useSubScreenBack();

  return <TopBar variant="sub" title={title} titleAs={titleAs} back={back} action={action} />;
}
