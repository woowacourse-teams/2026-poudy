"use client";

import { OAuthProvider } from "@poudy/api/api.zod";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { RegisteredAccountNotice } from "./RegisteredAccountNotice";
import { SIGNUP_SHEET_PATH } from "./SignupSheet";
import { WithdrawnNotice } from "./WithdrawnNotice";

import { findMe } from "@/lib/api/member";
import { loginErrorMessage } from "@/lib/domain/login-error";
import { rememberLastLogin } from "@/lib/storage/last-login";
import { takeLoginReturn } from "@/lib/storage/login-return";
import { reloadSavedProducts } from "@/lib/storage/saved-products";

type Props = {
  readonly error: string | null;
  readonly provider: string | null;
  readonly status: string | null;
};

/** 로그인 화면으로 돌아가는 버튼 모양의 링크. 주 행동이면 검정 면, 아니면 보조 면이다(BTN · Large). */
const BACK_TO_LOGIN_CLASS = {
  primary:
    "pressable press-scale fb-dim flex h-14 w-full max-w-sm items-center justify-center rounded-xl bg-action text-16 leading-none font-bold text-action-text",
  secondary:
    "pressable press-scale fb-secondary flex h-14 w-full max-w-sm items-center justify-center rounded-xl bg-button-secondary text-16 leading-none font-bold text-text-primary",
} as const;

function BackToLoginLink({ variant }: { readonly variant: keyof typeof BACK_TO_LOGIN_CLASS }) {
  const { pressableProps } = usePressable();

  return (
    <Link href="/login" replace {...pressableProps} className={BACK_TO_LOGIN_CLASS[variant]}>
      로그인 화면으로
    </Link>
  );
}

function Signing() {
  return (
    <main className="flex min-h-svh items-center justify-center px-gutter">
      <p role="status" className="text-title text-text-secondary">
        로그인하는 중이에요
      </p>
    </main>
  );
}

function RestoreRequestedNotice() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-gutter text-center">
      <p role="status" className="text-title leading-relaxed text-text-primary">
        복구 요청을 확인하고 있어요. <br />
        확인되면 다시 로그인할 수 있어요.
      </p>
      <BackToLoginLink variant="secondary" />
    </main>
  );
}

const SIGN_IN_FAILED = "OAUTH_LOGIN_FAILED";
const EMAIL_ALREADY_REGISTERED = "MEMBER_EMAIL_ALREADY_REGISTERED";

const WITHDRAWN = "WITHDRAWN";
const RESTORE_REQUESTED = "RESTORE_REQUESTED";
const SIGNUP_REQUIRED = "SIGNUP_REQUIRED";

export function LoginCallback({ error, provider, status }: Props) {
  if (status === RESTORE_REQUESTED) return <RestoreRequestedNotice />;
  if (status === WITHDRAWN) return <WithdrawnNotice />;
  if (status === SIGNUP_REQUIRED) return <SignupRedirect />;

  const registered = OAuthProvider.safeParse(provider);
  if (error === EMAIL_ALREADY_REGISTERED && registered.success) {
    return <RegisteredAccountNotice provider={registered.data} />;
  }

  return <SignInResult error={error} provider={provider} />;
}

function SignupRedirect() {
  const router = useRouter();

  useEffect(() => router.replace(SIGNUP_SHEET_PATH), [router]);

  return <Signing />;
}

function SignInResult({ error, provider }: Pick<Props, "error" | "provider">) {
  const router = useRouter();
  const [failure, setFailure] = useState(error);

  useEffect(() => {
    if (error) return;

    findMe()
      .then((member) => {
        void reloadSavedProducts();
        rememberLastLogin(member.provider);
        router.replace(takeLoginReturn());
      })
      .catch(() => setFailure(SIGN_IN_FAILED));
  }, [error, router]);

  if (!failure) return <Signing />;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-gutter text-center">
      <p role="alert" className="text-title leading-relaxed text-text-primary">
        {loginErrorMessage(failure, provider)}
      </p>
      <BackToLoginLink variant="primary" />
    </main>
  );
}
