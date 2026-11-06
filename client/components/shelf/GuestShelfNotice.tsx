"use client";

import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { requestShelfLogin } from "@/lib/analytics/shelf";
import { isGuestShelfMode } from "@/lib/api/guest-shelf";
import { hasShownGuestShelfNotice, rememberGuestShelfNoticeShown } from "@/lib/storage/guest-shelf";
import { rememberLoginReturn } from "@/lib/storage/login-return";

/**
 * 비로그인으로 처음 담았을 때 한 번 띄우는 안내. 로그인하지 않고 나가면 담은 제품이 사라진다고 알리고 로그인을 권한다.
 * 세션마다 한 번만 띄운다. 그 뒤로 담을 때는 원래 뜨는 토스트만 남는다.
 */
export const useGuestShelfNotice = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  /** 담기를 마치고 평가 시트가 닫힌 뒤 부른다. 시트 위에 시트가 겹치지 않게 한다. */
  const afterAdd = () => {
    if (!isGuestShelfMode() || hasShownGuestShelfNotice()) return;
    rememberGuestShelfNoticeShown();
    setOpen(true);
  };

  const notice = (
    <ConfirmSheet
      open={open}
      title="잠시 담아 뒀어요"
      description="로그인하지 않고 나가면 담은 제품이 사라져요. 남겨 두려면 로그인해 주세요."
      confirmLabel="로그인"
      cancelLabel="나중에"
      onConfirm={() => {
        setOpen(false);
        rememberLoginReturn();
        requestShelfLogin();
        router.push("/login");
      }}
      onCancel={() => setOpen(false)}
    />
  );

  return { afterAdd, notice };
};
