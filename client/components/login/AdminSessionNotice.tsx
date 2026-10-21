"use client";

import { Button } from "@poudy/design-system/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminLogout, isAdminSignedOut } from "@/lib/api/admin";
import { ADMIN_SESSION_MESSAGE } from "@/lib/domain/admin-session";

type Props = {
  /** 놓이는 화면의 레이아웃에 맞춘 바깥 클래스. */
  readonly className: string;
};

/**
 * 관리자 세션으로 회원 화면에 들어왔을 때 보여 준다. 관리자에서 로그아웃하면 회원 로그인으로 보낸다.
 */
export function AdminSessionNotice({ className }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const moveToLogin = () => {
    router.replace("/login");
  };

  const signOutAdmin = () => {
    setPending(true);
    setFailed(false);
    adminLogout()
      .then(moveToLogin)
      .catch((error: unknown) => {
        if (isAdminSignedOut(error)) {
          moveToLogin();
          return;
        }
        setFailed(true);
        setPending(false);
      });
  };

  return (
    <main className={className}>
      <p role="alert" className="text-title leading-relaxed text-text-primary">
        {ADMIN_SESSION_MESSAGE}
      </p>
      {failed ? (
        <p className="text-body text-text-secondary">로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.</p>
      ) : null}
      <Button size="lg" className="w-full max-w-sm" onClick={signOutAdmin} busy={pending}>
        관리자 로그아웃
      </Button>
    </main>
  );
}
