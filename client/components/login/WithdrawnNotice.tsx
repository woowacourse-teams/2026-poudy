"use client";

import type { WithdrawnAccountResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { useToast } from "@poudy/design-system/toast";
import { TopBar } from "@poudy/design-system/top-bar";
import { useEffect, useState } from "react";

import { AccountActionArea, ActionTextLink } from "./AccountActionArea";
import { AccountCard } from "./AccountCard";

import { AccountDataSummary } from "@/components/my-page/AccountDataSummary";
import { useSubScreenBack } from "@/components/navigation/useSubScreenBack";
import { findWithdrawnAccount, requestRestore } from "@/lib/api/member";
import { formatLongDate } from "@/lib/domain/format";
import { providerName } from "@/lib/domain/social-provider";

type RestoreState = "idle" | "sending" | "sent" | "failed";

/*
 * 임시 세션이라 다시 시도하려면 다시 로그인해야 한다. 토스트는 사라지므로, 실패한 뒤에 다시 누르면 요청하지 않고
 * 같은 안내를 다시 띄운다. 버튼을 막으면 사라진 토스트 대신 이유를 읽을 곳이 없다(FEEDBACK F04).
 */
const RESTORE_FAILED = "요청하지 못했어요. 다시 로그인한 뒤 요청해 주세요.";

function Deadline({ account }: { readonly account: WithdrawnAccountResponse | null | undefined }) {
  if (account === undefined) return null;
  if (account === null) {
    return <>이 계정을 다시 쓰려면 복구를 요청해 주세요. 확인되면 전에 쓰던 그대로 이어서 쓸 수 있어요.</>;
  }

  // 문장마다 줄을 나누고 마지막 날만 굵게 강조한다. 좁은 폭에서는 문장 안에서도 자연스럽게 줄을 바꾼다(S55g).
  return (
    <>
      <span className="block">{formatLongDate(account.withdrawnAt)}에 탈퇴했어요.</span>
      <span className="block">
        <strong className="font-semibold text-text-primary">{formatLongDate(account.restorableUntil)}까지</strong>{" "}
        복구할 수 있어요.
      </span>
    </>
  );
}

function RestoreRequested() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-gutter text-center">
      <p role="status" className="text-title leading-relaxed text-text-primary">
        복구를 요청했어요. <br />
        확인되면 다시 로그인할 수 있어요.
      </p>
      <div className="w-full max-w-sm">
        <ActionTextLink href="/">홈으로</ActionTextLink>
      </div>
    </main>
  );
}

/**
 * 탈퇴 계정 복구(S55g). 탈퇴한 날과 복구할 수 있는 마지막 날, 어떤 계정인지 보여 준다.
 * [계정 복구]는 복구를 요청하고, 관리자가 확인하면 다시 로그인할 수 있다.
 */
export function WithdrawnNotice() {
  const [account, setAccount] = useState<WithdrawnAccountResponse | null | undefined>(undefined);
  const [state, setState] = useState<RestoreState>("idle");
  const back = useSubScreenBack();
  const toast = useToast();

  useEffect(() => {
    findWithdrawnAccount()
      .then(setAccount)
      .catch(() => setAccount(null));
  }, []);

  const restore = () => {
    if (state === "failed") {
      toast.show({ message: RESTORE_FAILED });
      return;
    }
    setState("sending");
    requestRestore()
      .then(() => setState("sent"))
      .catch(() => {
        setState("failed");
        toast.show({ message: RESTORE_FAILED });
      });
  };

  if (state === "sent") return <RestoreRequested />;

  return (
    <Screen scroll="document">
      <TopBar variant="sub" title="계정 복구" titleAs="p" back={back} />
      <ScreenBody>
        <main className="flex flex-1 flex-col gap-5 px-gutter pt-4 pb-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-screen font-bold text-text-primary">탈퇴한 계정이에요</h1>
            <p className="text-body text-text-secondary">
              <Deadline account={account} />
            </p>
          </div>

          {account ? (
            <AccountCard
              provider={account.provider}
              email={account.email}
              caption={`${providerName(account.provider)}로 로그인`}
            />
          ) : null}

          <AccountDataSummary title="복구하면 그대로 돌아와요" />
        </main>
      </ScreenBody>

      <AccountActionArea>
        <Button size="lg" className="w-full" onClick={restore} busy={state === "sending"}>
          계정 복구
        </Button>
        <ActionTextLink href="/">다음에 할게요</ActionTextLink>
      </AccountActionArea>
    </Screen>
  );
}
