"use client";

import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useCallback, useState, type CSSProperties, type TransitionEvent } from "react";

import { requestSelectionHaptic } from "@/lib/interaction/haptic";

type SaveButtonProps = {
  readonly productName: string;
  readonly saved: boolean;
  readonly disabled?: boolean;
  readonly onToggle: () => void;
};

const SPARK_COUNT = 5;
const FULL_CIRCLE_DEGREES = 360;
const SPARK_SECTOR_DEGREES = FULL_CIRCLE_DEGREES / SPARK_COUNT;

const randomSparkAngles = (): readonly number[] =>
  Array.from(
    { length: SPARK_COUNT },
    (_, index) => index * SPARK_SECTOR_DEGREES + Math.random() * SPARK_SECTOR_DEGREES,
  );

/**
 * 위시리스트 카드의 하트(S55d). 아이콘만 있으므로 접근 가능한 이름을 붙이고, 채움은 brand-strong 이다.
 * 이름은 제품 상세의 위시리스트 추가 버튼과 같다.
 *
 * 눌림은 usePressable 이 맡는다. 담기 전에만 0.97 로 줄어든다(press-scale). 담긴 하트를 누르면 빼는 동작이라 줄이지 않는다.
 * 담는 순간에만 하트를 부풀리고 불꽃을 터뜨린다. 빼는 동작까지 축하하면 뜻이 어긋난다.
 */
export function SaveButton({ productName, saved, onToggle, disabled = false }: SaveButtonProps) {
  // 제품 상세의 위시리스트 추가 버튼과 같은 이름을 쓴다.
  const label = `${productName} ${saved ? "위시리스트에서 빼기" : "위시리스트에 추가"}`;
  const { pressableProps } = usePressable({ disabled });
  const [sparkAngles, setSparkAngles] = useState<readonly number[]>([]);
  const [popping, setPopping] = useState(false);

  const handleClick = () => {
    requestSelectionHaptic();

    /*
     * 줄이기를 켠 사람에게는 조각을 아예 만들지 않는다. 스타일로 감추기만 하면
     * 보이지 않는 것이 문서에 쌓인다.
     *
     * 끝나는 시점은 animationend 가 알려 준다. 시간을 세어 맞추려고 CSS 값을 읽으면
     * 누를 때마다 스타일 계산을 강제하게 된다.
     */
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const celebrate = !saved && !reduced;
    setSparkAngles(celebrate ? randomSparkAngles() : []);
    setPopping(celebrate);
    onToggle();
  };

  const finishPop = (event: TransitionEvent<HTMLSpanElement>) => {
    if (event.target === event.currentTarget && event.propertyName === "transform" && popping) setPopping(false);
  };

  return (
    <button
      type="button"
      {...pressableProps}
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={saved}
      aria-label={label}
      className={cn("pressable relative flex size-11 items-center justify-center rounded-xl", !saved && "press-scale")}
    >
      <span
        className="save-pop inline-flex items-center justify-center leading-none"
        data-popped={popping}
        onTransitionEnd={finishPop}
      >
        <Icon name="heart" filled={saved} size={24} className={saved ? "text-brand-strong" : "text-text-secondary"} />
      </span>
      <SparkBurst angles={sparkAngles} onDone={() => setSparkAngles([])} />
    </button>
  );
}

/**
 * 버튼 둘레로 퍼지는 불꽃. 자리를 차지하지 않도록 버튼 위에 겹쳐 둔다.
 * 뜻을 전하지 않는 장식이므로 보조 기술에서 감춘다.
 */
function SparkBurst({ angles, onDone }: { readonly angles: readonly number[]; readonly onDone: () => void }) {
  const onFirstSpark = useCallback(
    (element: HTMLSpanElement | null) => {
      if (!element) return;

      const done = () => onDone();
      element.addEventListener("animationend", done);
      return () => element.removeEventListener("animationend", done);
    },
    [onDone],
  );

  if (angles.length === 0) return null;

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {angles.map((angle, index) => {
        const style: CSSProperties & { readonly "--spark-angle": string } = {
          "--spark-angle": `${angle}deg`,
        };

        return (
          <span
            key={angle}
            style={style}
            /*
             * 조각이 여럿이지만 함께 시작해 함께 끝난다. 첫 조각만 듣고 걷는다.
             * React 의 합성 이벤트 대신 실제 요소에 직접 건다. animationend 는
             * 합성 이벤트로 오지 않는 환경이 있다.
             */
            ref={index === 0 ? onFirstSpark : undefined}
            className="animate-spark-burst absolute size-1.5 rounded-full bg-[#F04465]"
          />
        );
      })}
    </span>
  );
}
