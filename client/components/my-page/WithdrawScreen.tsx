"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { TopBar } from "@/components/ui/TopBar";
import { isAdminSession, isSignedOut, withdraw } from "@/lib/api/member";
import { notifyAppLogout } from "@/lib/interaction/app-login";
import { reloadSavedProducts } from "@/lib/storage/saved-products";

const WITHDRAW_FAILED = "탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요.";

const ERASED_ITEMS = ["위시리스트에 담은 제품", "성별 · 나이대 · 피부 타입 정보"] as const;

export function WithdrawScreen() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [adminSession, setAdminSession] = useState(false);

  const resign = () => {
    setPending(true);
    withdraw()
      .then(() => {
        notifyAppLogout();
        void reloadSavedProducts();
        router.replace("/login");
      })
      .catch((error: unknown) => {
        if (isSignedOut(error)) {
          router.replace("/login");
          return;
        }
        if (isAdminSession(error)) {
          setAdminSession(true);
          return;
        }
        window.alert(WITHDRAW_FAILED);
        setPending(false);
      });
  };

  if (adminSession) {
    return (
      <AdminSessionNotice className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center" />
    );
  }

  return (
    <>
      <TopBar title="탈퇴하기" variant="sub" titleAs="p" />
      <main className="flex flex-1 flex-col">
        <div className="flex-1 px-4 pt-4 pb-[var(--inquiry-button-clearance)]">
          <h1 className="text-[20px] font-bold tracking-tight">탈퇴하기 전에 확인해 주세요</h1>

          <div className="mt-5 rounded-lg bg-surface p-4">
            <p className="text-[14px] font-semibold">탈퇴하고 30일이 지나면 이 정보가 모두 지워져요</p>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[14px] text-text-primary">
              {ERASED_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-[14px] leading-relaxed text-text-secondary">
            30일 안에 같은 계정으로 다시 로그인하면 복구를 요청할 수 있어요. 30일이 지나면 모두 지워지고 되돌릴 수
            없어요.
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
            카카오·Google 계정 연결은 자동으로 해제되지 않아요. 연결도 해제하려면 해당 계정 설정에서 직접 해제해 주세요.
          </p>

          <label className="mt-6 flex cursor-pointer items-center gap-2 text-[14px] font-semibold">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="size-5 accent-action"
            />
            위 내용을 확인했고, 탈퇴할게요
          </label>
        </div>

        <div className="sticky bottom-0 h-[var(--bottom-action-bar-height)] border-t border-border bg-background px-4 pt-3 pb-6">
          <button
            type="button"
            onClick={resign}
            disabled={!confirmed || pending}
            className="flex h-13 w-full items-center justify-center rounded-button bg-danger-action text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            탈퇴하기
          </button>
        </div>
      </main>
    </>
  );
}
