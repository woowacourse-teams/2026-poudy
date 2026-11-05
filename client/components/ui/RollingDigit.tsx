"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/** 한 바퀴(0~9)를 도는 시간(ms). 자리마다 조금씩 달라 함께 돌아도 한 덩어리로 보이지 않는다. */
const SPIN_MS = 560;
const SPIN_MS_PER_PLACE = 90;
/** 돌던 숫자가 제 숫자에 멈추는 시간(ms). 처음은 돌던 속도에 가깝게 빠르고 끝에서 천천히 멈춘다. */
const LAND_MS = 450;
const LAND_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** 세로 줄이 지금 한 바퀴 가운데 어디까지 올라갔는지(0~1). 도는 중이든 멈추는 중이든 보이는 자리에서 읽는다. */
const turnOf = (column: HTMLElement): number => {
  const { transform } = getComputedStyle(column);
  const moved = transform === "none" ? 0 : -new DOMMatrixReadOnly(transform).m42;
  const turn = moved / column.offsetHeight;
  return ((turn % 1) + 1) % 1;
};

type RollingDigitProps = {
  readonly digit: number;
  /** 오른쪽에서 센 자리. 테스트가 자리를 짚을 때 쓴다. */
  readonly place: number;
  /** 구르기 시작하기 전에 기다리는 시간(ms). 여러 자리를 차례로 굴릴 때 쓴다. */
  readonly delay?: number;
  /**
   * 창의 위아래 가장자리를 흐릴지. 크게 쓰는 숫자는 구르는 동안 위아래 숫자 조각이 칼같이 잘려 줄 밖으로 삐져나온
   * 것처럼 보인다. 흐리면 들어오는 숫자는 서서히 나타나고 나가는 숫자는 서서히 사라진다.
   * 줄 높이가 넉넉해야(leading-tight 이상) 멈춘 숫자가 흐려지지 않으므로, 쓰는 쪽이 골라 켠다.
   */
  readonly fadeEdges?: boolean;
  /** 새 값을 기다리는 동안 계속 돈다. 끝나면 지금 자리에서 같은 방향으로 이어 굴러 digit 에 멈춘다. */
  readonly spinning?: boolean;
};

/**
 * 다이얼 한 자리. 0-9 를 세로로 세워 두고 해당 숫자가 보이도록 밀어 올린다.
 *
 * 창 높이만 글줄에서 받고, 안쪽은 전부 그 높이의 비율로 잡는다. 칸 높이와 미는 양을
 * 각각 `lh` 로 적으면 둘을 다른 자리에서 재게 되어, 반올림이 갈리는 화면에서 숫자가
 * 칸 사이에 걸린다.
 */
export function RollingDigit({ digit, place, delay = 0, fadeEdges = false, spinning = false }: RollingDigitProps) {
  const [ready, setReady] = useState(false);
  // 돌면 9 다음에 0 이 이어지도록 세로 줄 아래에 한 바퀴를 더 붙인다. 돌지 않는 자리에는 붙이지 않는다. 렌더링 중에 바꿔 한 번 더 그리지 않는다.
  const [looped, setLooped] = useState(spinning);
  if (spinning && !looped) setLooped(true);
  const frame = useRef<number | undefined>(undefined);
  const column = useRef<HTMLSpanElement>(null);
  const motion = useRef<Animation | undefined>(undefined);
  const latestDigit = useRef(digit);

  // 처음 붙는 자리는 굴리지 않는다. 0 에서 출발해 굴러오면 없던 숫자가 흘러온 것처럼 보인다.
  useEffect(() => {
    frame.current = requestAnimationFrame(() => setReady(true));

    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, []);

  useLayoutEffect(() => {
    latestDigit.current = digit;
  }, [digit]);

  useLayoutEffect(() => {
    const element = column.current;
    if (!element || typeof element.animate !== "function" || prefersReducedMotion()) return;

    if (spinning) {
      // 멈추던 중에 다시 돌아도 보이는 자리에서 이어 간다.
      const turn = motion.current ? turnOf(element) : latestDigit.current / 10;
      const duration = SPIN_MS + place * SPIN_MS_PER_PLACE;
      motion.current?.cancel();
      // 움직임이 자리를 맡는 동안 값이 바뀌어도 밑의 전환이 따로 움직이지 않게 끈다.
      element.style.transition = "none";
      const spin = element.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], {
        duration,
        iterations: Infinity,
        easing: "linear",
      });
      spin.currentTime = turn * duration;
      motion.current = spin;
      return;
    }

    if (!motion.current) return;

    // 돌던 방향 그대로 다음 바퀴의 제 숫자까지 밀어 올린다. 되돌아 내려가지 않는다.
    const turn = turnOf(element);
    motion.current.cancel();
    const land = element.animate(
      [{ transform: `translateY(-${turn * 100}%)` }, { transform: `translateY(-${100 + latestDigit.current * 10}%)` }],
      { duration: LAND_MS, easing: LAND_EASING },
    );
    motion.current = land;
    land.onfinish = () => {
      motion.current = undefined;
      element.style.transition = "";
    };
  }, [spinning, place]);

  useLayoutEffect(() => () => motion.current?.cancel(), []);

  return (
    <span
      data-digit={digit}
      data-place={place}
      data-spinning={spinning ? "" : undefined}
      className={`relative inline-block h-[1lh] w-[1ch] overflow-hidden tabular-nums ${fadeEdges ? "rolling-digit-fade" : ""}`}
    >
      <span
        ref={column}
        className={`absolute inset-x-0 top-0 flex h-[1000%] flex-col ${ready ? "motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out" : ""}`}
        style={{ transform: `translateY(-${digit * 10}%)`, transitionDelay: delay ? `${delay}ms` : undefined }}
      >
        {DIGITS.map((candidate) => (
          <span key={candidate} className="flex h-[10%] min-h-0 items-center justify-center">
            {candidate}
          </span>
        ))}
        {looped ? (
          <span className="absolute inset-x-0 top-full flex h-full flex-col">
            {DIGITS.map((candidate) => (
              <span key={candidate} className="flex h-[10%] min-h-0 items-center justify-center">
                {candidate}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </span>
  );
}
