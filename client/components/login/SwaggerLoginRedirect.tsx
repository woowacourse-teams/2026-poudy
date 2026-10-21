"use client";

import { useEffect, useRef } from "react";

import { socialLoginUrl, type SocialProvider } from "@/lib/api/member";
import { rememberSwaggerLoginReturn } from "@/lib/storage/login-return";

type Props = {
  readonly provider: SocialProvider;
  readonly popup: boolean;
};

export function SwaggerLoginRedirect({ provider, popup }: Props) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    rememberSwaggerLoginReturn(popup);
    location.replace(socialLoginUrl(provider));
  }, [provider, popup]);

  return <p role="status">로그인 화면으로 이동하고 있습니다.</p>;
}
