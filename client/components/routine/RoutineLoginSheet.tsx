"use client";

import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { useRouter } from "next/navigation";

import { requestFeatureLogin } from "@/lib/analytics/feature-login";
import { rememberLoginReturn } from "@/lib/storage/login-return";

type RoutineLoginSheetProps = {
  readonly open: boolean;
  readonly onClose: () => void;
};

/** 로그인하지 않은 채 루틴을 만들려 할 때 띄운다(S182). 설명은 루틴을 만들면 얻는 것을 적고, 버튼은 [다음에] [로그인]이다. */
export function RoutineLoginSheet({ open, onClose }: RoutineLoginSheetProps) {
  const router = useRouter();

  return (
    <ConfirmSheet
      open={open}
      title="루틴을 만들려면 로그인이 필요해요"
      description="내 루틴을 기록해 두고 다른 사람과 공유해 보세요."
      confirmLabel="로그인"
      cancelLabel="다음에"
      onConfirm={() => {
        onClose();
        rememberLoginReturn();
        requestFeatureLogin("routine_create");
        router.push("/login");
      }}
      onCancel={onClose}
    />
  );
}
