"use client";

import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { CheckboxGroup, CheckboxGroupItem } from "@poudy/design-system/checkbox-group";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { useToast } from "@poudy/design-system/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AccountDataSummary } from "./AccountDataSummary";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { SubTopBar } from "@/components/navigation/SubTopBar";
import { isAdminSession, isSignedOut, withdraw } from "@/lib/api/member";
import { notifyAppLogout } from "@/lib/interaction/app-login";
import { reloadSavedProducts } from "@/lib/storage/saved-products";

const WITHDRAW_FAILED = "탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요.";
const WITHDRAWN = "탈퇴했어요. 그동안 고마웠어요";
const CONFIRM_VALUE = "confirmed";

/** 탈퇴하기(S55f). 확인 체크를 해야 [탈퇴하기]가 켜진다. */
export function WithdrawScreen() {
  const router = useRouter();
  const toast = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [adminSession, setAdminSession] = useState(false);

  /** 탈퇴하면 로그인 전 상태의 홈으로 보낸다. */
  const resign = () => {
    setPending(true);
    withdraw()
      .then(() => {
        notifyAppLogout();
        void reloadSavedProducts();
        // 토스트는 루트 레이아웃에 있어 홈으로 옮긴 뒤에도 남는다.
        toast.show({ message: WITHDRAWN });
        router.replace("/");
      })
      .catch((error: unknown) => {
        if (isSignedOut(error)) {
          router.replace("/");
          return;
        }
        if (isAdminSession(error)) {
          setAdminSession(true);
          return;
        }
        toast.show({ message: WITHDRAW_FAILED });
        setPending(false);
      });
  };

  if (adminSession) {
    return (
      <AdminSessionNotice className="flex min-h-svh flex-col items-center justify-center gap-6 px-gutter text-center" />
    );
  }

  return (
    <Screen scroll="document">
      <SubTopBar title="탈퇴하기" titleAs="p" />
      <ScreenBody>
        <main className="flex flex-1 flex-col gap-5 px-gutter pt-4 pb-6">
          {/* 계정 복구(S55g)와 같은 틀: 머리(제목 + 안내 두 줄) → 지워지는 정보 → 확인 체크. */}
          <div className="flex flex-col gap-2">
            <h1 className="text-screen font-bold text-text-primary">탈퇴하기 전에 확인해 주세요</h1>
            <p className="text-body text-text-secondary">
              <span className="block">
                탈퇴하면 <strong className="font-semibold text-text-primary">30일 뒤</strong> 아래 정보가 모두 지워져요.
              </span>
              <span className="block">그 전에 복구를 요청하면 관리자 승인 후 복구돼요.</span>
            </p>
          </div>

          <AccountDataSummary title="지워지는 정보" />

          <CheckboxGroup
            aria-label="탈퇴 확인"
            value={confirmed ? [CONFIRM_VALUE] : []}
            onValueChange={(value) => setConfirmed(value.includes(CONFIRM_VALUE))}
          >
            <CheckboxGroupItem value={CONFIRM_VALUE}>위 내용을 확인했고, 탈퇴할게요</CheckboxGroupItem>
          </CheckboxGroup>
        </main>
      </ScreenBody>

      {/* 토스트를 이 줄 위로 올리는 표식(globals.css). contents 라 줄의 sticky 는 그대로다. */}
      <div data-toast-offset="action-bar" className="contents">
        <BottomActionBar
          position="screen-end"
          action={{ label: "탈퇴하기", tone: "destructive", onClick: resign, disabled: !confirmed, busy: pending }}
        />
      </div>
    </Screen>
  );
}
