"use client";

import { TopBar } from "./TopBar";

import { useHideOnScrollDown } from "@/lib/hooks/useHideOnScrollDown";
import { BOUNDARY_MARKER_CLASS, usePassedTopBoundary } from "@/lib/hooks/usePassedTopBoundary";

/** `TopBar variant="sub"` 의 높이. 이만큼 내려가기 전에는 숨기지 않는다. */
const TOP_BAR_HEIGHT = 44;

type HidingTopBarProps = {
  readonly title: string;
  readonly right?: React.ReactNode;
};

/**
 * 내려 읽는 동안에는 위로 물러나고, 거슬러 올리면 다시 내려오는 상단바.
 *
 * 다른 화면의 상단바는 늘 붙어 있고 그 아래 줄만 숨는다. 기획전처럼 위에서 아래로 길게
 * 읽는 화면은 바가 늘 붙어 있으면 그만큼 본문이 가려져, 이 화면에서만 바를 통째로 숨긴다.
 * 되돌아가려는 기색이 보이면 곧바로 뒤로 가기를 내준다.
 *
 * `TopBar` 는 붙는 일을 이 묶음에 맡기고(`sticky={false}`), 붙었을 때의 그림자와 화면을
 * 옮길 때 스크롤을 맞추는 표식은 `StickyBar` 와 같은 방식으로 이 묶음이 대신 둔다.
 */
export function HidingTopBar({ title, right }: HidingTopBarProps) {
  const hidden = useHideOnScrollDown({ hideAfter: TOP_BAR_HEIGHT });
  const { ref, passed } = usePassedTopBoundary<HTMLDivElement>({ enterAt: 0 });

  return (
    <>
      <div ref={ref} aria-hidden="true" className={BOUNDARY_MARKER_CLASS} />
      {/* 키보드로 바 안의 단추에 닿으면 숨김을 풀어 둔다. 규칙은 globals.css 의 `.hiding-top-bar` 에 있다. */}
      <div
        data-hidden={hidden}
        data-stuck={passed}
        className="hiding-top-bar stuck-edge sticky top-0 z-30 bg-background"
      >
        <TopBar title={title} variant="sub" right={right} sticky={false} />
      </div>
    </>
  );
}
