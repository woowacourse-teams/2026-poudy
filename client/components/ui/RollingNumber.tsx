"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { RollingDigit } from "./RollingDigit";

/** 사라지는 윗자리가 흐려지는 시간(ms). 명세 --duration-fast 와 같다. */
const LEAVE_MS = 150;

/** 자릿수가 줄면 없어지는 앞자리 글자. 굴리지 않고 그 자리에서 흐려진다. */
const leavingOf = (previous: string, current: string): string | undefined => {
  if (current.length >= previous.length) return undefined;
  return previous.slice(0, previous.length - current.length);
};

/**
 * 숫자가 바뀔 때 자리마다 다이얼이 굴러가듯 바뀐다.
 *
 * 자리마다 0-9 를 세로로 세워 두고 필요한 만큼 밀어 올린다. 자릿수가 바뀌어도
 * 각 자리가 제 숫자로 굴러가므로 값 사이를 이어 그리지 않아도 된다.
 *
 * 구르는 동안에는 열 개의 숫자가 모두 DOM 에 있다. 그대로 읽히면 뜻이 되지 않으므로
 * 쓰는 쪽에서 `aria-hidden` 으로 감추고 완성된 문구를 따로 전한다.
 *
 * spinning 이면 새 값을 받을 때까지 자리마다 계속 돈다. 동작 줄이기 설정에서는 돌지 않고 숫자를 흐려 세는 중임을 알린다.
 */
export function RollingNumber({ value, spinning = false }: { readonly value: number; readonly spinning?: boolean }) {
  const text = value.toLocaleString("ko-KR");
  const characters = text.split("");

  // 지난 글자와 사라지는 글자를 렌더링 중에 맞춰 한 번 더 그리지 않는다.
  const [shown, setShown] = useState(text);
  const [leaving, setLeaving] = useState<string | undefined>(undefined);
  if (shown !== text) {
    setShown(text);
    setLeaving(leavingOf(shown, text));
  }

  const leavingRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = leavingRef.current;
    if (!element) return;
    if (typeof element.animate !== "function") {
      setLeaving(undefined);
      return;
    }
    // 끝난 뒤 지워지기 전까지 다시 보이지 않게 끝 모습을 붙들어 둔다.
    const fade = element.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: LEAVE_MS,
      easing: "ease",
      fill: "forwards",
    });
    fade.onfinish = () => setLeaving(undefined);
    return () => fade.cancel();
  }, [leaving]);

  return (
    <span
      className={`relative inline-flex items-center motion-reduce:transition-opacity ${spinning ? "motion-reduce:opacity-50" : ""}`}
    >
      {leaving ? (
        <span ref={leavingRef} aria-hidden="true" className="absolute right-full whitespace-nowrap tabular-nums">
          {leaving}
        </span>
      ) : null}
      {characters.map((character, index) => {
        // 오른쪽에서 센 자리. 앞자리가 늘어도 일의 자리는 같은 칸에 남는다.
        const place = characters.length - index;

        return character === "," ? (
          // 쉼표는 굴리지 않는다. 자리 이동이 아니라 자릿수 표기라 함께 구르면 어지럽다.
          <span key={`comma-${place}`}>{character}</span>
        ) : (
          <RollingDigit key={`digit-${place}`} digit={Number(character)} place={place} spinning={spinning} />
        );
      })}
    </span>
  );
}
