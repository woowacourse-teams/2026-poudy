"use client";

import { cn } from "@poudy/design-system/cn";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useEffect, useRef, useState } from "react";

/**
 * 루틴 메모(RT4). 세 줄까지만 보이고, 넘치면 '더 보기'로 펼치고 '접기'로 다시 줄인다.
 * 버튼은 실제로 넘칠 때만 둔다.
 */
export function RoutineMemoText({ memo }: { readonly memo: string }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [clamped, setClamped] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { pressableProps } = usePressable();

  // 줄였을 때 넘치는지는 글자가 앉은 뒤에 재야 안다. 펼친 뒤에는 다시 재지 않는다.
  useEffect(() => {
    if (expanded) return;

    const measure = () => {
      const text = textRef.current;
      setClamped(!!text && text.scrollHeight > text.clientHeight + 1);
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    if (textRef.current) observer.observe(textRef.current);
    return () => observer.disconnect();
  }, [expanded, memo]);

  return (
    <div className="flex flex-col items-start">
      <p
        ref={textRef}
        className={cn("text-body leading-normal whitespace-pre-line text-text-body", !expanded && "line-clamp-3")}
      >
        {memo}
      </p>
      {clamped ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          {...pressableProps}
          className="pressable fb-surface flex min-h-11 items-center rounded-xs text-body font-semibold text-text-secondary"
        >
          {expanded ? "접기" : "더 보기"}
        </button>
      ) : null}
    </div>
  );
}
