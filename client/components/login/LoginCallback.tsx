"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { findMe } from "@/lib/api/member";
import { loginErrorMessage } from "@/lib/domain/login-error";

type Props = {
  readonly error: string | null;
  readonly provider: string | null;
};

const SIGN_IN_FAILED = "OAUTH_LOGIN_FAILED";

export function LoginCallback({ error, provider }: Props) {
  const router = useRouter();
  const [failure, setFailure] = useState(error);

  useEffect(() => {
    if (error) return;

    findMe()
      .then((member) => router.replace(member.profileCompleted ? "/" : "/onboarding"))
      .catch(() => setFailure(SIGN_IN_FAILED));
  }, [error, router]);

  if (!failure) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4">
        <p role="status" className="text-[15px] text-text-secondary">
          로그인하는 중이에요
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <p role="alert" className="text-[15px] leading-relaxed">
        {loginErrorMessage(failure, provider)}
      </p>
      <Link
        href="/login"
        replace
        className="flex h-[52px] w-full max-w-sm items-center justify-center rounded-button bg-action text-[16px] font-bold text-action-text"
      >
        로그인 화면으로
      </Link>
    </main>
  );
}
