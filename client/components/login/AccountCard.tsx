import type { OAuthProvider } from "@poudy/api/api.zod";

import { ProviderBadge } from "./ProviderIcon";

/**
 * 어떤 계정인지 보여 주는 회색 카드(S55g · S55h · S55i). 로고(32) · 이메일(15/600) · 아래 한 줄(13)이다.
 * 아래 줄은 화면이 정한다. 예: '카카오로 로그인'(복구), '카카오로 가입'(다른 방법으로 가입).
 */
export function AccountCard({
  provider,
  email,
  caption,
}: {
  readonly provider: OAuthProvider;
  readonly email: string;
  readonly caption: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface p-4">
      <ProviderBadge provider={provider} size="xlarge" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-title font-semibold break-all text-text-primary">{email}</span>
        <span className="text-body-sm text-text-secondary">{caption}</span>
      </span>
    </div>
  );
}
