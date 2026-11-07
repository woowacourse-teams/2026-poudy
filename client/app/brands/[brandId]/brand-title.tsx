"use client";

import { createContext, type ReactNode, use, useState } from "react";

import { BrandMark } from "./brand-mark";

import { usePassedTopBoundary } from "@/lib/hooks/usePassedTopBoundary";

/** 탐색 앱바(TopBar explore)의 높이. 히어로의 브랜드명이 이 아래로 완전히 가려지면 바 제목을 바꾼다. */
const APP_BAR_HEIGHT = 56;

type BrandTitleState = {
  readonly passed: boolean;
  readonly markerRef: (element: HTMLSpanElement | null) => void;
};

const BrandTitleContext = createContext<BrandTitleState | null>(null);

/**
 * 브랜드 상세의 바 제목과 히어로를 잇는다(명세 S30 · S30-1).
 *
 * 히어로는 스트리밍으로 늦게 붙을 수 있다. 그래서 표식이 실제로 붙었을 때 관찰을 켠다.
 * 관찰은 IntersectionObserver 가 맡아 스크롤마다 위치를 재지 않는다.
 */
export function BrandTitleScope({ children }: { readonly children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const { ref, passed } = usePassedTopBoundary<HTMLSpanElement>({ enterAt: APP_BAR_HEIGHT, enabled: ready });

  const markerRef = (element: HTMLSpanElement | null) => {
    ref.current = element;
    setReady(element !== null);
  };

  return <BrandTitleContext value={{ passed, markerRef }}>{children}</BrandTitleContext>;
}

/**
 * 히어로 브랜드명의 아래 끝. 이 표식이 바 아래로 지나가면 브랜드명이 다 가려진 것이다.
 * 이름 상자 안에 겹쳐 두어 높이를 더하지 않는다.
 */
export function BrandNameEnd() {
  const state = use(BrandTitleContext);

  return <span ref={state?.markerRef} aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px" />;
}

type BrandBarTitleProps = {
  readonly name: string;
  readonly imageUrl?: string | null;
};

/**
 * 바 제목. 맨 위에서는 '브랜드관'이고, 히어로의 브랜드명이 가려지면 로고 24 와 브랜드명으로 바뀐다.
 *
 * 두 제목을 한 칸에 겹쳐 두고 불투명도만 바꾼다(MOTION fast 150ms). 바 높이와 자리는 그대로라 화면이 흔들리지 않는다.
 * 움직임이 없는 전환이라 동작 줄이기에서도 그대로 둔다(MOTION M03).
 * 보이지 않는 쪽은 낭독에서 감춰, 접근 가능한 이름은 늘 보이는 제목 하나다.
 *
 * 스크롤 뒤 제목은 브랜드명이 바의 가운데에 온다. 오른쪽에 로고 칸과 같은 폭의 빈 칸을 두어 줄이 좌우 대칭이 되게 한다.
 * 로고는 이름 바로 왼쪽에 붙어 이름과 함께 움직이고, 긴 이름은 양쪽 칸을 뺀 폭 안에서 말줄임된다.
 * 줄이 칸을 넘으면 양쪽으로 넘쳐 로고가 잘리므로 max-w-full 로 칸 안에 가둔다.
 */
export function BrandBarTitle({ name, imageUrl }: BrandBarTitleProps) {
  const passed = use(BrandTitleContext)?.passed ?? false;
  const layer = "col-start-1 row-start-1 transition-opacity duration-(--duration-fast) ease-out";

  return (
    <span className="grid min-w-0 items-center justify-items-center">
      <span aria-hidden={passed} className={`${layer} ${passed ? "opacity-0" : ""}`}>
        브랜드관
      </span>
      <span
        aria-hidden={!passed}
        className={`${layer} flex max-w-full min-w-0 items-center gap-2 ${passed ? "" : "opacity-0"}`}
      >
        <BrandMark name={name} imageUrl={imageUrl} size="bar" />
        <span className="min-w-0 truncate">{name}</span>
        <span aria-hidden="true" className="size-6 shrink-0" />
      </span>
    </span>
  );
}
