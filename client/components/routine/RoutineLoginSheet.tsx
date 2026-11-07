"use client";

import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { useRouter } from "next/navigation";

import { rememberLoginReturn } from "@/lib/storage/login-return";

type RoutineLoginSheetProps = {
  readonly open: boolean;
  readonly onClose: () => void;
};

/** 로그인하지 않은 채 루틴을 만들려 할 때 띄운다(RT10 시트의 문구를 만들기에 맞춰 바꿈). */
export function RoutineLoginSheet({ open, onClose }: RoutineLoginSheetProps) {
  const router = useRouter();

  return (
    <ConfirmSheet
      open={open}
      title="루틴을 만들려면 로그인이 필요해요"
      description="로그인하면 아침과 저녁에 쓰는 제품을 순서대로 묶어 둘 수 있어요."
      confirmLabel="로그인하고 만들기"
      cancelLabel="다음에 할게요"
      onConfirm={() => {
        onClose();
        rememberLoginReturn();
        router.push("/login");
      }}
      onCancel={onClose}
    />
  );
}
