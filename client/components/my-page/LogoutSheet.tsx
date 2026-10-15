"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";

type Props = {
  readonly open: boolean;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
};

export function LogoutSheet({ open, pending, onClose, onConfirm }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.Header title="로그아웃할까요?" description="다시 로그인하면 위시리스트를 그대로 볼 수 있어요." />
      <BottomSheet.Footer>
        <button
          type="button"
          onClick={onClose}
          className="h-12 flex-1 rounded-xl bg-[#F3F4F5] text-[14px] font-bold text-[#4D5159]"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="h-12 flex-1 rounded-xl bg-action text-[14px] font-bold text-action-text disabled:opacity-40"
        >
          로그아웃
        </button>
      </BottomSheet.Footer>
    </BottomSheet>
  );
}
