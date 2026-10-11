"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SIGNUP_SHEET_PATH } from "./SignupSheet";

import { findMe, requestRestore } from "@/lib/api/member";
import { loginErrorMessage } from "@/lib/domain/login-error";
import { rememberLastLogin } from "@/lib/storage/last-login";
import { reloadSavedProducts } from "@/lib/storage/saved-products";

type Props = {
  readonly error: string | null;
  readonly provider: string | null;
  readonly status: string | null;
};

type RestoreState = "idle" | "sending" | "sent" | "failed";

const BACK_TO_LOGIN_CLASS =
  "flex h-[52px] w-full max-w-sm items-center justify-center rounded-button border border-border bg-background text-[16px] font-bold";

function WithdrawnNotice() {
  const [state, setState] = useState<RestoreState>("idle");

  const restore = () => {
    setState("sending");
    requestRestore()
      .then(() => setState("sent"))
      .catch(() => setState("failed"));
  };

  if (state === "sent") {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
        <p role="status" className="text-[15px] leading-relaxed">
          복구를 요청했어요. <br />
          확인되면 다시 로그인할 수 있어요.
        </p>
        <Link href="/" replace className={BACK_TO_LOGIN_CLASS}>
          홈으로
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-[15px] leading-relaxed">
        탈퇴한 계정이에요. <br />이 계정을 다시 쓰려면 복구를 요청해 주세요.
      </p>
      {state === "failed" ? (
        <p role="alert" className="text-[14px] text-text-secondary">
          요청하지 못했어요. 다시 로그인한 뒤 요청해 주세요.
        </p>
      ) : null}
      <button
        type="button"
        onClick={restore}
        disabled={state === "sending" || state === "failed"}
        className="flex h-[52px] w-full max-w-sm items-center justify-center rounded-button bg-action text-[16px] font-bold text-action-text disabled:opacity-40"
      >
        복구 요청하기
      </button>
      <Link href="/login" replace className={BACK_TO_LOGIN_CLASS}>
        로그인 화면으로
      </Link>
    </main>
  );
}

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

const WITHDRAWN = "WITHDRAWN";
const RESTORE_REQUESTED = "RESTORE_REQUESTED";
const SIGNUP_REQUIRED = "SIGNUP_REQUIRED";

export function LoginCallback({ error, provider, status }: Props) {
  if (status === RESTORE_REQUESTED) return <RestoreRequestedNotice />;
  if (status === WITHDRAWN) return <WithdrawnNotice />;
  if (status === SIGNUP_REQUIRED) return <SignupRedirect />;

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
        router.replace("/");
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
