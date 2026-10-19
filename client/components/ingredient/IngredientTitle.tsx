"use client";

import { cn } from "@poudy/design-system/cn";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useEffect, useRef, useState } from "react";

type IngredientTitleProps = {
  readonly koreanName: string;
  readonly englishName: string;
};

/**
 * 성분 이름은 띄어쓰기 없이 서른 자를 넘기도 하고, 영문 표기는 그보다 더 길다.
 * 그대로 두면 이름만으로 첫 화면이 차므로 각각 두 줄까지만 보이고 나머지는 열어서 본다.
 *
 * 한 성분의 두 표기라 단추도 하나만 둔다. 표기마다 단추가 붙으면 이름 사이가 갈라져
 * 둘이 한 덩어리로 읽히지 않는다.
 *
 * 여는 단추는 실제로 넘칠 때만 둔다. 짧은 이름에 눌러도 아무 일 없는 단추가 남으면
 * 그게 더 어수선하다.
 */
export function IngredientTitle({ koreanName, englishName }: IngredientTitleProps) {
  const koreanRef = useRef<HTMLHeadingElement>(null);
  const englishRef = useRef<HTMLParagraphElement>(null);
  const [clamped, setClamped] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { pressableProps } = usePressable();

  /*
   * 두 줄로 줄였을 때 실제로 넘치는지는 글자가 앉은 뒤에 재야만 안다. CSS 로는 줄인 글이 넘쳤는지 알 수 없어
   * 효과에서 한 번 재고, 글꼴과 폭이 바뀔 때 다시 잰다.
   */
  useEffect(() => {
    // 접힌 상태의 높이로만 잴 수 있다. 펼친 뒤에는 넘칠 일이 없어 다시 재지 않는다.
    if (expanded) return;

    const overflows = (el: HTMLElement | null) => !!el && el.scrollHeight > el.clientHeight + 1;
    const measure = () => setClamped(overflows(koreanRef.current) || overflows(englishRef.current));

    measure();

    /*
     * 글꼴이 앉기 전에는 글자가 좁아 두 줄에 들어간다. 그 값으로 재면 넘치는 이름도
     * 안 넘친다고 나오므로, 글꼴이 준비된 뒤 한 번 더 잰다.
     */
    document.fonts?.ready.then(measure).catch(() => {});

    // 화면 너비가 바뀌면 넘치는지도 달라진다.
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(measure);
    if (koreanRef.current) observer.observe(koreanRef.current);
    if (englishRef.current) observer.observe(englishRef.current);
    return () => observer.disconnect();
  }, [expanded, koreanName, englishName]);

  const clamp = expanded ? undefined : "line-clamp-2";

  return (
    <div className="flex flex-col gap-2">
      <h1 ref={koreanRef} className={cn("text-screen font-bold text-text-primary", clamp)}>
        {koreanName}
      </h1>
      <p ref={englishRef} className={cn("text-body-sm leading-snug text-text-muted", clamp)}>
        {englishName}
      </p>

      {clamped ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          {...pressableProps}
          // 글자 버튼이지만 누르는 높이 44 를 지킨다(A11Y D12). 면은 글자 둘레에만 칠한다.
          className="pressable fb-surface flex min-h-11 items-center self-start rounded-xs text-caption font-semibold text-text-secondary underline underline-offset-2"
        >
          {expanded ? "접기" : "전체 이름 보기"}
        </button>
      ) : null}
    </div>
  );
}
