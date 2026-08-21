"use client";

import { useState } from "react";

import { Icon } from "./icons/Icon";

type SaveButtonProps = {
  readonly productName: string;
  readonly saved: boolean;
  readonly onToggle: () => void;
  /** 와이드는 제품 상세에서 쓰는 글자 있는 형태다(디자인 C05). */
  readonly variant?: "icon" | "wide";
};

/** 불꽃 조각이 퍼지는 방향. 고르게 흩어지도록 여덟 갈래로 나눈다. */
const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

/** 불꽃이 사라지는 데 걸리는 시간. globals.css 의 spark-burst 와 맞춘다. */
const BURST_MS = 520;

/**
 * 저장 버튼. 아이콘만 있는 형태는 이름을 읽을 수 없으므로 접근 가능한 이름을 붙인다.
 * 저장 전과 저장됨의 생김새가 다르다.
 *
 * 담는 순간에만 불꽃을 터뜨린다. 빼는 동작까지 축하하면 뜻이 어긋난다.
 */
export function SaveButton({ productName, saved, onToggle, variant = "icon" }: SaveButtonProps) {
  const label = `${productName} ${saved ? "저장 해제" : "저장"}`;
  const [bursting, setBursting] = useState(false);

  const handleClick = () => {
    if (!saved) {
      // 연달아 누르면 애니메이션을 처음부터 다시 시작한다.
      setBursting(false);
      requestAnimationFrame(() => setBursting(true));
      window.setTimeout(() => setBursting(false), BURST_MS);
    }
    onToggle();
  };

  if (variant === "wide") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={saved}
        aria-label={label}
        className={`relative flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] text-[15px] font-bold transition-transform duration-100 active:scale-[0.97] ${
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
          <Icon name="bookmark" size={18} filled={saved} className={bursting ? "animate-save-pop" : undefined} />
          <SparkBurst active={bursting} />
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
      className="relative flex size-11 cursor-pointer items-center justify-center rounded-[10px] transition-transform duration-100 active:scale-90"
    >
      <Icon
        name="bookmark"
        size={20}
        filled={saved}
        className={`${saved ? "text-[#F04465]" : "text-text-secondary"} ${bursting ? "animate-save-pop" : ""}`}
      />
      <SparkBurst active={bursting} />
    </button>
  );
}

/**
 * 버튼 둘레로 퍼지는 불꽃. 자리를 차지하지 않도록 버튼 위에 겹쳐 둔다.
 * 뜻을 전하지 않는 장식이므로 보조 기술에서 감춘다.
 */
function SparkBurst({ active }: { readonly active: boolean }) {
  if (!active) return null;

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {SPARK_ANGLES.map((angle) => (
        <span
          key={angle}
          style={{ "--spark-angle": `${angle}deg` } as React.CSSProperties}
          className="animate-spark-burst absolute size-1 rounded-full bg-[#F04465]"
        />
      ))}
    </span>
  );
}
