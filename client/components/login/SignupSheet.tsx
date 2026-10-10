"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { CheckMark } from "@/components/ui/CheckMark";
import { ApiError } from "@/lib/api/client";
import { findMe, signUp } from "@/lib/api/member";
import { loginErrorMessage } from "@/lib/domain/login-error";
import { rememberLastLogin } from "@/lib/storage/last-login";

const SIGNUP_PARAMETER = "signup";
const SIGNUP_REQUIRED = "required";

/** 처음 소셜 로그인한 사람을 이 주소로 보내면 로그인 화면 위에 가입 확인 시트가 열린다. */
export const SIGNUP_SHEET_PATH = `/login?${SIGNUP_PARAMETER}=${SIGNUP_REQUIRED}`;

type SignupState = "idle" | "sending" | "expired" | "failed";

const failureOf = (error: unknown): { readonly state: SignupState; readonly message: string } => {
  if (error instanceof ApiError && error.code === "SIGNUP_ACCOUNT_NOT_FOUND") {
    return { state: "expired", message: "가입 시간이 지났어요. 다시 로그인해 주세요." };
  }
  if (error instanceof ApiError && error.code === "MEMBER_EMAIL_ALREADY_REGISTERED") {
    return { state: "expired", message: loginErrorMessage(error.code, null) };
  }
  return { state: "failed", message: "가입하지 못했어요. 잠시 후 다시 시도해 주세요." };
};

/**
 * 처음 소셜 로그인한 사람에게만 열린다. 만 14세 미만은 법정대리인 동의 절차가 없어 받지 않으므로,
 * 직접 체크해야만 가입할 수 있다. 닫고 떠나면 서버에 맡겨 둔 계정은 10분 뒤 사라진다.
 */
export function SignupSheet() {
  const router = useRouter();
  const open = useSearchParams().get(SIGNUP_PARAMETER) === SIGNUP_REQUIRED;
  const [overFourteen, setOverFourteen] = useState(false);
  const [state, setState] = useState<SignupState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const canSignUp = overFourteen && (state === "idle" || state === "failed");

  const submit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSignUp) return;

    setState("sending");
    setMessage(null);
    signUp()
      .then(() => {
        findMe()
          .then((member) => rememberLastLogin(member.provider))
          .catch(() => undefined);
        router.replace("/onboarding");
      })
      .catch((error: unknown) => {
        const failure = failureOf(error);
        setState(failure.state);
        setMessage(failure.message);
      });
  };

  return (
    <BottomSheet open={open} onClose={() => router.replace("/login")}>
      <BottomSheet.Header title="가입 전에 확인해 주세요" description="파우디는 만 14세 이상만 가입할 수 있어요." />

      <form onSubmit={submit} className="flex flex-col px-5 pb-6">
        <label className="flex h-[52px] cursor-pointer items-center gap-2.5 rounded-xl border border-[#d3d6dc] px-4">
          <input
            type="checkbox"
            checked={overFourteen}
            onChange={(event) => setOverFourteen(event.target.checked)}
            className="peer sr-only"
          />
          <span className="rounded-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-action">
            <CheckMark checked={overFourteen} />
          </span>
          <span className="text-[15px]">만 14세 이상이에요</span>
        </label>

        {message && (
          <p role="alert" className="mt-3 text-[13px] text-text-secondary">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSignUp}
          className="mt-6 flex h-[52px] items-center justify-center rounded-button bg-action text-[16px] font-bold text-action-text disabled:cursor-default disabled:bg-[#F3F4F5] disabled:text-[#9EA3AB]"
        >
          동의하고 계속
        </button>
        <Link
          href="/"
          replace
          className="mt-1 flex min-h-12 items-center justify-center rounded-button text-[14px] font-bold text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
        >
          로그인 없이 둘러보기
        </Link>
      </form>
    </BottomSheet>
  );
}
