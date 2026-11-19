"use client";

import { useEffect } from "react";

import { reportBoundaryError } from "@/lib/analytics/report-error";
import { RETRY_LATER } from "@/lib/domain/messages";
import { reloadForStaleBuild } from "@/lib/navigation/stale-build";

/*
 * 이 파일은 루트 레이아웃을 대신 그려 레이아웃이 불러온 전역 스타일을 받지 못한다. 같은 CSS 를 여기서 다시 불러와
 * 토큰과 Tailwind 클래스, 본문 글꼴을 쓴다. 같은 모듈이라 다른 화면에 스타일시트가 하나 더 붙지 않는다.
 */
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

/**
 * 루트 레이아웃까지 무너졌을 때(S332). 이 파일이 레이아웃을 대신하므로 html·body 를 직접 그린다.
 *
 * 아이콘 스프라이트는 레이아웃에 있어 쓸 수 없다. 버튼도 usePressable 에 기대지 않는 기본 button 으로 둔다.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportBoundaryError(error, "global");
    reloadForStaleBuild(error);
  }, [error]);

  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-dvh flex-col items-center justify-center px-gutter py-14 text-center">
        <title>문제가 생겼어요 · Poudy</title>

        {/* 간격은 이 칸에 둔다. body 에 두면 디자인 시스템이 body 끝에 붙이는 빈 overlay-root 까지 한 칸으로 세어 8 이 밀린다. */}
        <main className="flex flex-col items-center gap-2">
          {/* 글자는 ErrorState 와 같은 역할 토큰을 쓴다. 버튼과 오류 코드는 위 8 을 더 띄운다(명세의 위 패딩 8 칸). */}
          <p className="text-section font-bold text-text-primary">문제가 생겼어요</p>
          <p className="text-body-sm text-text-secondary">{RETRY_LATER}</p>

          <div className="pt-2">
            <button
              type="button"
              onClick={retry}
              className="h-11 cursor-pointer rounded-lg border border-border bg-background px-5 text-body leading-none font-bold text-text-primary"
            >
              다시 시도
            </button>
          </div>

          {error.digest ? <p className="pt-2 text-caption text-text-muted">오류 코드 {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
