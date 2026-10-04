"use client";

import type { MemberResponse } from "@poudy/api/api.zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { findMe, isSignedOut, logout, withdraw } from "@/lib/api/member";
import { providerName } from "@/lib/domain/social-provider";
import { reloadSavedProducts } from "@/lib/storage/saved-products";

const LOGOUT_FAILED = "로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.";
const WITHDRAW_FAILED = "탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요.";
const WITHDRAW_CONFIRM = "탈퇴하면 이 계정으로 로그인할 수 없어요. 다시 쓰려면 복구를 요청해야 해요. 탈퇴할까요?";

export function MyPageScreen() {
  const router = useRouter();
  const [member, setMember] = useState<MemberResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    findMe()
      .then(setMember)
      .catch((error: unknown) => {
        if (isSignedOut(error)) {
          router.replace("/login");
          return;
        }
        setLoadFailed(true);
      });
  }, [router]);

  const leave = (request: () => Promise<void>, failure: string) => {
    setPending(true);
    request()
      .then(() => {
        void reloadSavedProducts();
        router.replace("/login");
      })
      .catch((error: unknown) => {
        if (isSignedOut(error)) {
          router.replace("/login");
          return;
        }
        window.alert(failure);
        setPending(false);
      });
  };

  const signOut = () => leave(logout, LOGOUT_FAILED);

  const resign = () => {
    if (window.confirm(WITHDRAW_CONFIRM)) leave(withdraw, WITHDRAW_FAILED);
  };

  if (loadFailed) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4">
        <p role="alert" className="text-[15px] text-text-secondary">
          회원 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4">
        <p role="status" className="text-[15px] text-text-secondary">
          불러오는 중이에요
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh flex-col px-4 pt-10 pb-6">
      <h1 className="text-[24px] font-bold tracking-tight">마이페이지</h1>

      <section aria-labelledby="account-title" className="mt-8 rounded-xl border border-border p-4">
        <h2 id="account-title" className="text-[14px] font-bold text-text-secondary">
          로그인 계정
        </h2>
        <p className="mt-2 text-[16px] font-bold">{providerName(member.provider)} 계정</p>
        <p className="mt-1 text-[14px] break-all text-text-secondary">{member.email}</p>
      </section>

      <div className="mt-auto flex flex-col gap-2.5 pt-10">
        <button
          type="button"
          onClick={signOut}
          disabled={pending}
          className="flex h-[52px] items-center justify-center rounded-button border border-border bg-background text-[16px] font-bold disabled:opacity-40"
        >
          로그아웃
        </button>
        <button
          type="button"
          onClick={resign}
          disabled={pending}
          className="flex min-h-12 items-center justify-center rounded-button text-[14px] font-bold text-text-secondary disabled:opacity-40"
        >
          회원 탈퇴
        </button>
      </div>
    </main>
  );
}
