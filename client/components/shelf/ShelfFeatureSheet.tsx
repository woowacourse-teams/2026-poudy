"use client";

import { BottomSheet, BottomSheetBody, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";

import { GuideCarousel, type GuideStep } from "./GuideCarousel";
import styles from "./ShelfFeatureSheet.module.css";

const STEPS: readonly GuideStep[] = [
  { title: "사용해본 제품을 담아요", description: "평가는 나중에 해도 돼요.", scene: 0 },
  { title: "잘 맞았는지 골라요", description: "평가한 제품이 많을수록 결과가 정확해져요.", scene: 1 },
  { title: "안 맞는 성분을 찾아요", description: "평가한 제품을 통해서 나에게 안 맞는 성분을 찾아줘요.", scene: 2 },
  { title: "나만의 필터에 추가해요", description: "피하고 싶은 성분을 골라 추가해요.", scene: 3 },
  {
    title: "그 성분은 검색에서 빼요",
    description: "제품 검색에서 나만의 필터를 켜면 나에게 맞는 제품만 보여줘요.",
    scene: 4,
  },
];

/** 06 시안의 구조와 움직임을 TSX로 옮기고 기존 BottomSheet의 접근성·닫기를 사용한다. */
export function ShelfFeatureSheet({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} handle={false}>
      <GuideCarousel
        steps={STEPS}
        open={open}
        label="파우치 사용법 단계"
        className="-mx-5"
        wrap={(content) => <BottomSheetBody>{content}</BottomSheetBody>}
        header={(step) => (
          <>
            <div data-sheet-grab="" className={styles.grab}>
              <span />
            </div>
            <div className={styles.header}>
              <BottomSheetHeader
                title={
                  <>
                    파우치 사용법{" "}
                    <span className={styles.count}>
                      <b>{step + 1}</b> / {STEPS.length}
                    </span>
                  </>
                }
                onClose={onClose}
              />
            </div>
          </>
        )}
      />
    </BottomSheet>
  );
}
