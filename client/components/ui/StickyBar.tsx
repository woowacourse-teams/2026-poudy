"use client";

import { usePassedTopBoundary } from "@/lib/hooks/usePassedTopBoundary";

type StickyBarProps = {
  /**
   * 바로 앞 자리가 화면 위에서 이만큼 내려온 곳을 지나면 붙은 것으로 본다(px).
   * 붙는 높이(`top`)에서 바의 위쪽 음의 여백을 뺀 값이다.
   */
  readonly stuckAt: number;
  readonly className: string;
  readonly children: React.ReactNode;
};

/**
 * 상단바 아래에 함께 붙는 줄. 실제로 붙었을 때만 아래 선을 긋는다(`.stuck-edge`).
 *
 * 문서 전체의 스크롤 위치만으로는 알 수 없다. 조금만 내려도 아직 화면 가운데에 있는 줄에
 * 선이 생긴다. 줄 바로 앞 자리를 지켜보고, 그 자리가 붙는 높이 위로 지나가면 붙은 것으로
 * 본다.
 */
export function StickyBar({ stuckAt, className, children }: StickyBarProps) {
  const { ref, passed } = usePassedTopBoundary<HTMLDivElement>({ enterAt: stuckAt });

  return (
    <>
      <div ref={ref} aria-hidden="true" />
      <div data-stuck={passed} className={`stuck-edge ${className}`}>
        {children}
      </div>
    </>
  );
}
