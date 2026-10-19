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
 * 보이지 않는 쪽은 낭독에서 감춰, 접근 가능한 이름은 늘 보이는 제목 하나다.
 */
export function BrandBarTitle({ name, imageUrl }: BrandBarTitleProps) {
  const passed = use(BrandTitleContext)?.passed ?? false;
  const layer =
    "col-start-1 row-start-1 transition-opacity duration-(--duration-fast) ease-out motion-reduce:transition-none";

  return (
    <span className="grid min-w-0 items-center justify-items-center">
      <span aria-hidden={passed} className={`${layer} ${passed ? "opacity-0" : ""}`}>
        브랜드관
      </span>
      <span aria-hidden={!passed} className={`${layer} flex min-w-0 items-center gap-2 ${passed ? "" : "opacity-0"}`}>
        <BrandMark name={name} imageUrl={imageUrl} size="bar" />
        <span className="min-w-0 truncate">{name}</span>
      </span>
    </span>
  );
}
