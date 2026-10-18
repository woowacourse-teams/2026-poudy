"use client";

import { TopBar } from "@poudy/design-system/top-bar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { hasInSiteHistory } from "@/lib/navigation/history-depth";

/* 방문 기록은 스스로 알려 오지 않는다. 그릴 때마다 그때의 기록을 읽는다. */
const subscribe = () => () => {};

/* 서버에는 방문 기록이 없다. 미리 만든 화면은 기록이 있는 쪽으로 그린다. */
const serverSnapshot = () => false;

type SubTopBarProps = {
  readonly title: string;
  /** 본문에 진짜 제목이 있는 화면은 p 로 내린다. 모양은 그대로다. */
  readonly titleAs?: "h1" | "p";
};

/**
 * 하위 화면의 상단 내비(명세 APP · 상단 내비 · 하위). 디자인 시스템 TopBar 에 뒤로가기 할 일을 넘긴다.
 *
 * 방문 기록이 없으면(밖에서 바로 들어온 경우) 뒤로가기 자리에 홈으로 가는 링크를 세우고 이름도 '홈으로'로 바꾼다.
 * 정해진 주소로 가는 일이라 역할도 단추가 아니라 링크다. 기록은 브라우저에만 있어 붙은 뒤에 바뀐다.
 */
export function SubTopBar({ title, titleAs }: SubTopBarProps) {
  const router = useRouter();
  const toHome = useSyncExternalStore(subscribe, () => !hasInSiteHistory(), serverSnapshot);

  /* 한 화면에 머무는 동안 기록이 늘 수 있어 누르는 순간 다시 살핀다. */
  const goBack = () => {
    if (hasInSiteHistory()) {
      router.back();
      return;
    }
    router.replace("/");
  };

  return (
    <TopBar
      variant="sub"
      title={title}
      titleAs={titleAs}
      back={
        toHome
          ? // 기록을 늘리지 않도록 지금 화면을 대신한다.
            { asChild: <Link href="/" replace />, label: "홈으로" }
          : { onClick: goBack }
      }
    />
  );
}
