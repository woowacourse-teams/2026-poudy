"use client";

import { BottomSheet, BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";

import { ExcludeCodesAbout } from "@/components/filter/ExcludeCodesAbout";
import type { KnownExcludeCodeResponse } from "@/lib/domain/exclude-codes";

type QuickFilterInfoSheetProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly quickFilters: readonly KnownExcludeCodeResponse[];
};

/**
 * 자주 피하는 성분 설명 시트(명세 S22b). 본문은 조건 일치 제품의 설명(S23h)과 같은 `ExcludeCodesAbout`을 쓰고,
 * 이 화면에서는 행을 누르면 성분군 설명으로 간다. 탐색 조건은 주소에 남아 있어 돌아와도 잃지 않는다.
 */
export function QuickFilterInfoSheet({ open, onClose, quickFilters }: QuickFilterInfoSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheetHeader title="자주 피하는 성분이란?" />
      <BottomSheetBody>
        <ExcludeCodesAbout
          quickFilters={quickFilters}
          hrefOf={(code) => `/ingredient-groups/${encodeURIComponent(code)}`}
        />
      </BottomSheetBody>
      <BottomSheetFooter primary={{ label: "확인", onClick: onClose }} />
    </BottomSheet>
  );
}
