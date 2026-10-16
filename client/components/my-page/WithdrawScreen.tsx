"use client";

import { Button } from "@poudy/design-system/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AccountDataSummary } from "./AccountDataSummary";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
// TODO(#729): 하위 상단 내비(TopBar)가 디자인 시스템에 들어오면 바꾼다. 지금은 client 의 옛 TopBar 를 쓴다.
import { TopBar } from "@/components/ui/TopBar";
import { isAdminSession, isSignedOut, withdraw } from "@/lib/api/member";
import { notifyAppLogout } from "@/lib/interaction/app-login";
import { reloadSavedProducts } from "@/lib/storage/saved-products";

const WITHDRAW_FAILED = "탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요.";

/** 탈퇴하기(S55f). 확인 체크를 해야 [탈퇴하기]가 켜진다. */
export function WithdrawScreen() {
  const router = useRouter();
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
        // TODO(#728): 홈에 '탈퇴했어요. 그동안 고마웠어요' 토스트를 띄운다.
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
        // TODO(#728): 토스트로 알린다. 지금은 브라우저 알림 창을 쓴다.
        window.alert(WITHDRAW_FAILED);
        setPending(false);
      });
  };

  if (adminSession) {
    return (
      <AdminSessionNotice className="flex min-h-svh flex-col items-center justify-center gap-6 px-gutter text-center" />
    );
  }

  return (
    <>
      <TopBar title="탈퇴하기" variant="sub" titleAs="p" />
      <main className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-5 px-gutter pt-4 pb-6">
          <h1 className="text-screen font-bold text-text-primary">탈퇴하기 전에 확인해 주세요</h1>

          <AccountDataSummary title="탈퇴하고 30일이 지나면 이 정보가 모두 지워져요" />

          <div className="flex flex-col gap-2 text-body text-text-secondary">
            {/*
              명세는 '다시 가입하면 그대로 되살아나요'라고 쓰지만, 실제로는 다시 로그인한 뒤 복구를 요청하고 관리자가 확인한다.
              개인정보 처리방침과 같은 내용으로 둔다. 계정 연결 안내도 명세에는 없지만 처리방침과 맞추려고 남긴다.
            */}
            <p>
              30일 안에 같은 계정으로 다시 로그인하면 복구를 요청할 수 있어요. 30일이 지나면 모두 지워지고 되돌릴 수
              없어요.
            </p>
            <p>
              카카오·Google 계정 연결은 자동으로 해제되지 않아요. 연결도 해제하려면 해당 계정 설정에서 직접 해제해
              주세요.
            </p>
          </div>

          <label className="flex min-h-12 cursor-pointer items-center gap-2 px-1 text-title font-semibold text-text-primary">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="size-5 shrink-0 accent-action"
            />
            위 내용을 확인했고, 탈퇴할게요
          </label>
        </div>

        {/* TODO(#729): 하단 행동 영역(BottomActionBar)이 들어오면 그 안에 둔다. 지금은 화면 끝에 붙인다. */}
        <div className="sticky bottom-0 border-t border-border bg-background px-gutter pt-3 pb-safe">
          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={resign}
            disabled={!confirmed}
            busy={pending}
          >
            탈퇴하기
          </Button>
        </div>
      </main>
    </>
  );
}
