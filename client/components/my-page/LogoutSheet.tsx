"use client";

import { Button } from "@poudy/design-system/button";

/*
 * 시트 그릇은 아직 디자인 시스템에 없어(#727) client 의 옛 BottomSheet 를 쓴다.
 * TODO(#727): ConfirmSheet 가 들어오면 그릇만 바꾼다. 안의 문구와 버튼은 그대로 둔다.
 */
import { BottomSheet } from "@/components/ui/BottomSheet";

type Props = {
  readonly open: boolean;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
};

/** 로그아웃 확인 시트(S55e). */
export function LogoutSheet({ open, pending, onClose, onConfirm }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.CustomHeader>
        <div className="flex flex-col gap-2 px-5 pt-2 pb-5">
          <BottomSheet.Title className="text-block font-bold text-text-primary">로그아웃할까요?</BottomSheet.Title>
          <p className="text-body text-text-secondary">다시 로그인하면 선반과 위시리스트를 그대로 볼 수 있어요.</p>
        </div>
      </BottomSheet.CustomHeader>
      {/* 명세는 발도 머리와 같은 20 여백을 둔다. 옛 Footer 는 16 이라 여기서 직접 늘어놓는다. */}
      <div className="flex shrink-0 gap-2 px-5 pb-safe">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          취소
        </Button>
        <Button className="flex-1" busy={pending} onClick={onConfirm}>
          로그아웃
        </Button>
      </div>
    </BottomSheet>
  );
}
