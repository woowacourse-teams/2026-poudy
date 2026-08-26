"use client";

import { type CSSProperties, useCallback, useState } from "react";

import { Icon } from "./icons/Icon";

import { requestSelectionHaptic } from "@/lib/interaction/haptic";

type SaveButtonProps = {
  readonly productName: string;
  readonly saved: boolean;
  readonly onToggle: () => void;
  /** 와이드는 제품 상세에서 쓰는 글자 있는 형태다(디자인 C05). */
  readonly variant?: "icon" | "wide";
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
 * 저장 버튼. 아이콘만 있는 형태는 이름을 읽을 수 없으므로 접근 가능한 이름을 붙인다.
 * 저장 전과 저장됨의 생김새가 다르다.
 *
 * 담는 순간에만 불꽃을 터뜨린다. 빼는 동작까지 축하하면 뜻이 어긋난다.
 */
export function SaveButton({ productName, saved, onToggle, variant = "icon" }: SaveButtonProps) {
  const label = `${productName} ${saved ? "저장 해제" : "저장"}`;
  const [sparkAngles, setSparkAngles] = useState<readonly number[]>([]);

  const handleClick = () => {
    requestSelectionHaptic();

    /*
     * 담는 순간에만 불꽃을 터뜨린다. 빼는 동작까지 축하하면 뜻이 어긋난다.
     * 줄이기를 켠 사람에게는 조각을 아예 만들지 않는다. 스타일로 감추기만 하면
     * 보이지 않는 것이 문서에 쌓인다.
     *
     * 끝나는 시점은 animationend 가 알려 준다. 시간을 세어 맞추려고 CSS 값을 읽으면
     * 누를 때마다 스타일 계산을 강제하게 된다.
     */
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setSparkAngles(saved || reduced ? [] : randomSparkAngles());
    onToggle();
  };

  if (variant === "wide") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={saved}
        aria-label={label}
        className={`relative flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] text-[15px] font-bold transition-transform duration-press ease-out motion-reduce:transition-none ${saved ? "" : "active:scale-[0.97] motion-reduce:active:scale-100"} ${
          saved ? "border border-[#F5CBD4] bg-[#FFF1F3] text-[#D93B5C]" : "bg-action text-action-text"
        }`}
      >
        {/*
          `제품 저장` 과 `저장됨` 은 길이가 달라 그대로 두면 글자와 아이콘이 좌우로 밀린다.
          긴 쪽을 자리로 잡아 두고 그 안에서 글자만 바꿔 위치를 고정한다.
        */}
        <span className="grid">
          <span className="invisible col-start-1 row-start-1" aria-hidden="true">
            제품 저장
          </span>
          <span className="col-start-1 row-start-1">{saved ? "저장됨" : "제품 저장"}</span>
        </span>
        <span className="relative inline-flex">
          {/* 부풀기는 Icon 이 아니라 감싼 span 이 맡는다. Icon 은 data-* 를 넘기지 않는다. */}
          <span className="save-pop inline-flex" data-popped={sparkAngles.length > 0}>
            <Icon name="bookmark" size={18} filled={saved} />
          </span>
          <SparkBurst angles={sparkAngles} onDone={() => setSparkAngles([])} />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={label}
      className={`relative flex size-11 cursor-pointer items-center justify-center rounded-[10px] transition-transform duration-press ease-out motion-reduce:transition-none ${saved ? "" : "active:scale-90 motion-reduce:active:scale-100"}`}
    >
      <span className="save-pop inline-flex" data-popped={sparkAngles.length > 0}>
        <Icon name="bookmark" size={20} filled={saved} className={saved ? "text-[#F04465]" : "text-text-secondary"} />
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
