"use client";

import type { WithdrawnAccountResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ProviderBadge } from "./ProviderIcon";

import { TopBar } from "@/components/ui/TopBar";
import { findWithdrawnAccount, requestRestore } from "@/lib/api/member";
import { formatDate } from "@/lib/domain/format";

type RestoreState = "idle" | "sending" | "sent" | "failed";

const RESTORED_ITEMS = ["위시리스트에 담은 제품", "성별 · 나이대 · 피부 타입 정보"] as const;

const SECONDARY_LINK_CLASS =
  "flex min-h-12 items-center justify-center rounded-button text-[14px] font-bold text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action";

function Deadline({ account }: { readonly account: WithdrawnAccountResponse | null | undefined }) {
  if (account === undefined) return null;
  if (account === null) {
    return <>이 계정을 다시 쓰려면 복구를 요청해 주세요. 확인되면 전에 쓰던 그대로 이어서 쓸 수 있어요.</>;
  }

  return (
    <>
      {formatDate(account.withdrawnAt)}에 탈퇴했어요. {formatDate(account.restorableUntil)}까지 복구를 요청하면 확인 후
      전에 쓰던 그대로 이어서 쓸 수 있어요.
    </>
  );
}

function RestoreRequested() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <p role="status" className="text-[15px] leading-relaxed">
        복구를 요청했어요. <br />
        확인되면 다시 로그인할 수 있어요.
      </p>
      <Link
        href="/"
        replace
        className="flex h-13 w-full max-w-sm items-center justify-center rounded-button border border-border bg-background text-[15px] font-bold"
      >
        홈으로
      </Link>
    </main>
  );
}

export function WithdrawnNotice() {
  const [account, setAccount] = useState<WithdrawnAccountResponse | null | undefined>(undefined);
  const [state, setState] = useState<RestoreState>("idle");

  useEffect(() => {
    findWithdrawnAccount()
      .then(setAccount)
      .catch(() => setAccount(null));
  }, []);

  const restore = () => {
    setState("sending");
    requestRestore()
      .then(() => setState("sent"))
      .catch(() => setState("failed"));
  };

  if (state === "sent") return <RestoreRequested />;

  return (
    <>
      <TopBar title="계정 되살리기" variant="sub" titleAs="p" />
      <main className="flex flex-1 flex-col">
        <div className="flex-1 px-4 pt-4 pb-10">
          <h1 className="text-[20px] font-bold tracking-tight">탈퇴한 계정이에요</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
            <Deadline account={account} />
          </p>

          {account && (
            <p className="mt-5 flex items-center gap-2 text-[15px] font-bold break-all">
              <ProviderBadge provider={account.provider} size="small" />
              {account.email}
            </p>
          )}

          <div className="mt-5 rounded-lg bg-surface p-4">
            <p className="text-[14px] text-text-secondary">되살리면 그대로 돌아와요</p>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[14px] text-text-primary">
              {RESTORED_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col gap-1 border-t border-border bg-background px-4 pt-3 pb-6">
          {state === "failed" && (
            <p role="alert" className="mb-2 text-center text-[14px] text-text-secondary">
              요청하지 못했어요. 다시 로그인한 뒤 요청해 주세요.
            </p>
          )}
          <button
            type="button"
            onClick={restore}
            disabled={state === "sending" || state === "failed"}
            className="flex h-13 w-full items-center justify-center rounded-button bg-action text-[15px] font-bold text-action-text disabled:cursor-not-allowed"
          >
            계정 되살리기
          </button>
          <Link href="/" replace className={SECONDARY_LINK_CLASS}>
            다음에 할게요
          </Link>
        </div>
      </main>
    </>
  );
}
