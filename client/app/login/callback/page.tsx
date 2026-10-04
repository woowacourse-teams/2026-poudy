import type { Metadata } from "next";

import { LoginCallback } from "@/components/login/LoginCallback";

export const metadata: Metadata = {
  title: "로그인",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

type Props = {
  readonly searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
};

const single = (value: string | string[] | undefined): string | null => (typeof value === "string" ? value : null);

export default async function LoginCallbackPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <LoginCallback
      error={single(params.error)}
      provider={single(params.provider)}
      withdrawn={single(params.withdrawn) === "true"}
      restoreRequested={single(params.restoreRequested) === "true"}
    />
  );
}
