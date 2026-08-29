"use client";

import { useEffect, useRef, useState } from "react";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

type RollingDigitProps = {
  readonly digit: number;
  /** 오른쪽에서 센 자리. 테스트가 자리를 짚을 때 쓴다. */
  readonly place: number;
};

/**
 * 다이얼 한 자리. 0-9 를 세로로 세워 두고 해당 숫자가 보이도록 밀어 올린다.
 *
 * 창 높이만 글줄에서 받고, 안쪽은 전부 그 높이의 비율로 잡는다. 칸 높이와 미는 양을
 * 각각 `lh` 로 적으면 둘을 다른 자리에서 재게 되어, 반올림이 갈리는 화면에서 숫자가
 * 칸 사이에 걸린다.
 */
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
        className={`absolute inset-x-0 top-0 flex h-[1000%] flex-col ${ready ? "motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out" : ""}`}
        style={{ transform: `translateY(-${digit * 10}%)` }}
      >
        {DIGITS.map((candidate) => (
          <span key={candidate} className="flex h-[10%] min-h-0 items-center justify-center">
            {candidate}
          </span>
        ))}
      </span>
    </span>
  );
}
