"use client";

import { useEffect, useRef, useState } from "react";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

type RollingDigitProps = {
  readonly digit: number;
  /** 오른쪽에서 센 자리. 테스트가 자리를 짚을 때 쓴다. */
  readonly place: number;
};

/** 다이얼 한 자리. 0-9 를 세로로 세워 두고 해당 숫자가 보이도록 밀어 올린다. */
export function RollingDigit({ digit, place }: RollingDigitProps) {
  const [ready, setReady] = useState(false);
  const frame = useRef<number | undefined>(undefined);

  // 처음 붙는 자리는 굴리지 않는다. 0 에서 출발해 굴러오면 없던 숫자가 흘러온 것처럼 보인다.
  useEffect(() => {
    frame.current = requestAnimationFrame(() => setReady(true));

    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <span
      data-digit={digit}
      data-place={place}
      className="relative inline-block h-[1lh] w-[1ch] overflow-hidden tabular-nums"
    >
      <span
        className={`absolute inset-x-0 top-0 flex flex-col ${ready ? "motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out" : ""}`}
        style={{ transform: `translateY(-${digit}lh)` }}
      >
        {DIGITS.map((candidate) => (
          <span key={candidate} className="h-[1lh] leading-[1lh]">
            {candidate}
          </span>
        ))}
      </span>
    </span>
  );
}
