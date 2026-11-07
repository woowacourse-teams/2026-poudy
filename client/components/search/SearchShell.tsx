"use client";

import type { TopBarTextAction } from "@poudy/design-system/top-bar";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { SearchModeTabs } from "./SearchModeTabs";

import { SubTopBar } from "@/components/navigation/SubTopBar";

const ActionContext = createContext<(action: TopBarTextAction | undefined) => void>(() => undefined);

/**
 * 화면이 상단 내비의 글자 행동(성분 탭의 '초기화')을 맡긴다. 내비는 두 탭이 함께 쓰는 레이아웃에 있어 화면이 직접 그리지 못한다.
 * 누를 때는 그 화면의 마지막 동작을 부른다. 글자가 바뀌거나 사라질 때만 내비를 다시 그린다.
 */
export function useSearchTopBarAction(action: TopBarTextAction | undefined) {
  const setAction = useContext(ActionContext);
  const latest = useRef(action);
  const text = action?.text;

  useEffect(() => {
    latest.current = action;
  });

  useEffect(() => {
    setAction(text === undefined ? undefined : { text, onClick: () => latest.current?.onClick() });
    return () => setAction(undefined);
  }, [setAction, text]);
}

/**
 * S21 · S22 탐색 조건 설정의 머리. 상단 내비와 검색 모드 탭을 두 탭의 화면이 함께 쓴다.
 * 탭을 옮겨도 머리가 다시 그려지지 않아, 밑줄 하나가 이전 탭에서 새 탭으로 미끄러진다.
 */
export function SearchShell({ children }: { readonly children: ReactNode }) {
  const [action, setAction] = useState<TopBarTextAction>();

  return (
    <ActionContext value={setAction}>
      <main className="flex flex-1 flex-col">
        <SubTopBar title="탐색 조건 설정" action={action} />
        <div className="px-gutter pt-3">
          <SearchModeTabs />
        </div>
        {children}
      </main>
    </ActionContext>
  );
}
