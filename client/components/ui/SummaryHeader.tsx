"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { StickyBar } from "@/components/ui/StickyBar";
import { TopBar } from "@/components/ui/TopBar";
import { usePassedTopBoundary } from "@/lib/hooks/usePassedTopBoundary";

/** `TopBar variant="sub"` 의 높이. 축약형이 그 아래에서 자리를 이어받는다. */
const TOP_BAR_HEIGHT = 44;

/**
 * 나타나는 자리와 사라지는 자리를 벌려 두는 폭.
 *
 * 두 자리가 같으면 그 경계에 손을 멈춘 채 조금만 흔들어도 나타남과 사라짐이 번갈아 걸린다.
 * 한 번 나타난 뒤에는 이만큼 더 거슬러 올라가야 사라지게 해 그 떨림을 없앤다.
 */
const HYSTERESIS = 24;

const Context = createContext<React.Dispatch<React.SetStateAction<boolean>> | undefined>(undefined);

type SummaryHeaderProps = {
  readonly title: string;
  readonly right?: React.ReactNode;
  /** 원래 배치가 지나간 뒤 그 자리를 대신할 가로 축약형. */
  readonly summary: React.ReactNode;
  readonly children: React.ReactNode;
};

/**
 * 하위 화면의 머리. 뒤로가기와 함께, 본문 윗부분이 지나간 뒤 그 축약형을 붙여 둔다.
 * 제품 상세는 제품 정보를, 브랜드관은 브랜드를 축약해 둔다.
 *
 * `TopBar` 는 스스로 붙지만 여기서는 감싸는 쪽이 붙는 일을 맡는다. 축약형이 머리 아래에
 * 매달려 함께 붙어야 하는데, `TopBar` 만 붙으면 축약형은 제 자리에 남는다.
 *
 * 축약형은 머리 아래에 겹쳐 둔다. 흐름에 두면 처음부터 그만큼 자리를 차지해 원래 배치가
 * 밀려 내려가고, 붙는 순간 높이를 늘리면 아래 본문이 그만큼 튄다.
 */
export function SummaryHeader({ title, right, summary, children }: SummaryHeaderProps) {
  const [passed, setPassed] = useState(false);

  return (
    <Context.Provider value={setPassed}>
      {/* 바텀시트의 딤(z-40)·시트(z-50)보다 아래에 둔다. */}
      {/*
        스크롤할 때의 아래 그림자는 바가 아니라 이 묶음이 드리운다. 바는 z-index 를 가져 축약형
        위에 그려지므로, 바가 드리우면 축약형이 나타난 뒤에도 바와 축약형 사이에 그림자가 남는다.
        묶음의 그림자는 자식인 축약형 밑에 그려져 축약형이 나타나면 가려지고, 축약형의 아래
        그림자가 대신한다.
      */}
      <StickyBar stuckAt={0} className="sticky top-0 z-30 h-11 bg-background">
        <TopBar title={title} variant="sub" right={right} titleAs="p" edge={false} sticky={false} />

        <div
          data-stuck={passed}
          inert={!passed}
          className="product-summary-bar absolute inset-x-0 top-full bg-background"
        >
          {summary}
        </div>
      </StickyBar>

      {children}
    </Context.Provider>
  );
}

/**
 * 원래 배치가 끝나는 자리. 이 자리가 머리 아래로 지나가면 축약형이 대신 나타난다.
 *
 * 스크롤 양을 세지 않고 자리를 지켜본다. 원래 배치의 높이는 용량 개수나 이름 길이에
 * 따라 달라져 어림잡은 값으로는 나타나는 때가 화면마다 어긋난다.
 */
export function SummaryEnd() {
  const setPassed = useContext(Context);
  const { ref, passed } = usePassedTopBoundary<HTMLDivElement>({
    enterAt: TOP_BAR_HEIGHT,
    leaveAt: TOP_BAR_HEIGHT + HYSTERESIS,
    enabled: Boolean(setPassed),
  });

  useEffect(() => {
    setPassed?.(passed);
  }, [passed, setPassed]);

  return <div ref={ref} aria-hidden="true" className="h-px" />;
}
