"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { adminLogin } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";

const INPUT_CLASS = "h-11 w-full rounded-button border border-border bg-background px-3 text-[15px]";

const failureMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.status === 401) return "아이디 또는 비밀번호가 맞지 않아요.";
  return "로그인하지 못했어요. 잠시 후 다시 시도해 주세요.";
};

export function AdminLoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setFailure(null);
    adminLogin(username, password)
      .then(() => router.replace("/admin"))
      .catch((error: unknown) => {
        setFailure(failureMessage(error));
        setPending(false);
      });
  };

  return (
    <main data-desktop-page className="flex min-h-svh items-center justify-center bg-surface px-6">
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-background p-8"
      >
        <h1 className="text-[22px] font-bold tracking-tight">관리자</h1>
        <label className="flex flex-col gap-1.5 text-[14px] font-bold">
          아이디
          <input
            name="username"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[14px] font-bold">
          비밀번호
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={INPUT_CLASS}
          />
        </label>
        {failure && (
          <p role="alert" className="text-[14px] text-text-secondary">
            {failure}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="mt-2 flex h-11 items-center justify-center rounded-button bg-action text-[15px] font-bold text-action-text disabled:opacity-40"
        >
          로그인
        </button>
      </form>
    </main>
  );
}
