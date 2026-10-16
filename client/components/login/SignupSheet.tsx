"use client";

import { Button } from "@poudy/design-system/button";
import { CheckboxGroup, CheckboxGroupItem } from "@poudy/design-system/checkbox-group";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { BrowseWithoutLoginLink } from "./BrowseWithoutLoginLink";

/*
 * 시트 그릇은 아직 디자인 시스템에 없어(#727) client 의 옛 BottomSheet 를 쓴다.
 * TODO(#727): ConfirmSheet 가 들어오면 그릇만 바꾼다. 안의 문구와 버튼은 그대로 둔다.
 */
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ApiError } from "@/lib/api/client";
import { findMe, signUp } from "@/lib/api/member";
import { loginErrorMessage } from "@/lib/domain/login-error";
import { rememberLastLogin } from "@/lib/storage/last-login";

const SIGNUP_PARAMETER = "signup";
const OVER_FOURTEEN = "over-fourteen";
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
        router.replace("/signup/profile");
      })
      .catch((error: unknown) => {
        const failure = failureOf(error);
        setState(failure.state);
        setMessage(failure.message);
      });
  };

  return (
    <BottomSheet open={open} onClose={() => router.replace("/login")}>
      <BottomSheet.CustomHeader>
        <div className="flex flex-col gap-2 px-gutter pt-2 pb-5">
          <BottomSheet.Title className="text-block font-bold text-text-primary">
            가입 전에 확인해 주세요
          </BottomSheet.Title>
          <p className="text-body text-text-secondary">파우디는 만 14세 이상만 가입할 수 있어요.</p>
        </div>
      </BottomSheet.CustomHeader>

      <form onSubmit={submit} className="flex flex-col gap-5 px-gutter pb-safe">
        <div className="rounded-lg border border-border-strong bg-background px-3 has-checked:border-action">
          <CheckboxGroup
            aria-label="나이 확인"
            value={overFourteen ? [OVER_FOURTEEN] : []}
            onValueChange={(value) => setOverFourteen(value.includes(OVER_FOURTEEN))}
          >
            <CheckboxGroupItem value={OVER_FOURTEEN}>만 14세 이상이에요</CheckboxGroupItem>
          </CheckboxGroup>
        </div>

        <div className="flex flex-col gap-2">
          {/* TODO(#728): 가입하지 못하면 토스트로 알린다. 지금은 버튼 위에 문구를 둔다. */}
          {message ? (
            <p role="alert" className="text-center text-body text-text-secondary">
              {message}
            </p>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={!overFourteen || state === "expired"}
            busy={state === "sending"}
          >
            동의하고 계속
          </Button>
          <div className="flex justify-center">
            <BrowseWithoutLoginLink />
          </div>
        </div>
      </form>
    </BottomSheet>
  );
}
