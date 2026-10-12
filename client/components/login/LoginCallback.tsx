"use client";

import { OAuthProvider } from "@poudy/api/api.zod";
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

const BACK_TO_LOGIN_CLASS =
  "flex h-[52px] w-full max-w-sm items-center justify-center rounded-button border border-border bg-background text-[16px] font-bold";

function RestoreRequestedNotice() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <p role="status" className="text-[15px] leading-relaxed">
        복구 요청을 확인하고 있어요. <br />
        확인되면 다시 로그인할 수 있어요.
      </p>
      <Link href="/login" replace className={BACK_TO_LOGIN_CLASS}>
        로그인 화면으로
      </Link>
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

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <p role="status" className="text-[15px] text-text-secondary">
        로그인하는 중이에요
      </p>
    </main>
  );
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
