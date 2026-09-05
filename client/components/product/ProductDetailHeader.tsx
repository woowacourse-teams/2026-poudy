"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

import { TopBar } from "@/components/ui/TopBar";

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

type ProductDetailHeaderProps = {
  readonly title: string;
  readonly right?: React.ReactNode;
  /** 원래 배치가 지나간 뒤 그 자리를 대신할 가로 축약형. */
  readonly summary: React.ReactNode;
  readonly children: React.ReactNode;
};

/**
 * 제품 상세의 머리. 뒤로가기와 축약한 제품 정보를 함께 붙여 둔다.
 *
 * `TopBar` 는 다른 화면도 쓰는 공용 컴포넌트라 그대로 두고, 감싸는 쪽이 붙는 일을 맡는다.
 * 붙이는 방식은 `fixed` 가 아니라 `sticky` 다. 본문이 `max-width` 로 가운데 놓인 카드라
 * `fixed` 로 두면 폭이 화면 전체로 벌어진다.
 *
 * 축약형은 머리 아래에 겹쳐 둔다. 흐름에 두면 처음부터 그만큼 자리를 차지해 원래 배치가
 * 밀려 내려가고, 붙는 순간 높이를 늘리면 아래 본문이 그만큼 튄다.
 */
export function ProductDetailHeader({ title, right, summary, children }: ProductDetailHeaderProps) {
  const [passed, setPassed] = useState(false);

  return (
    <Context.Provider value={setPassed}>
      {/* 바텀시트의 딤(z-40)·시트(z-50)보다 아래에 둔다. */}
      <div className="sticky top-0 z-30 h-11 bg-background">
        <TopBar title={title} variant="sub" right={right} titleAs="p" />

        <div
          data-stuck={passed}
          inert={!passed}
          className="product-summary-bar absolute inset-x-0 top-full border-b border-border bg-background"
        >
          {summary}
        </div>
      </div>

      {children}
    </Context.Provider>
  );
}

/**
 * 원래 배치가 끝나는 자리. 이 자리가 머리 아래로 지나가면 축약형이 대신 나타난다.
 *
 * 스크롤 양을 세지 않고 자리를 지켜본다. 원래 배치의 높이는 용량 개수와 제품명 길이에
 * 따라 달라져 어림잡은 값으로는 나타나는 때가 제품마다 어긋난다.
 */
export function ProductSummaryEnd() {
  const setPassed = useContext(Context);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !setPassed) return;

    // 지켜볼 수 없는 환경에서는 축약형을 띄우지 않는다. 원래 배치는 그대로 읽힌다.
    if (typeof IntersectionObserver === "undefined") return;

    /*
     * 지켜보는 자리를 두 곳에 둔다. 하나로 두면 그 경계를 넘을 때만 알려 오므로, 되돌아올 때
     * 알려 오는 값이 사라질 자리에 닿지 않아 축약형이 남는다.
     *
     * 나타나는 자리는 머리 바로 아래, 사라지는 자리는 그보다 `HYSTERESIS` 만큼 더 아래다.
     * 각 자리를 넘는 순간마다 알려 오니 그 자리에서 곧바로 뒤집는다.
     */
    const observers = [
      [TOP_BAR_HEIGHT, true],
      [TOP_BAR_HEIGHT + HYSTERESIS, false],
    ].map(([margin, entering]) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          // 자리 위로 지나갔으면 나타나고, 아래로 되돌아왔으면 물러난다.
          const above = entry.boundingClientRect.top < Number(margin);
          setPassed((passed) => (entering ? (above ? true : passed) : above ? passed : false));
        },
        { rootMargin: `-${margin}px 0px 0px 0px` },
      );

      observer.observe(element);
      return observer;
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, [setPassed]);

  return <div ref={ref} aria-hidden="true" className="h-px" />;
}
