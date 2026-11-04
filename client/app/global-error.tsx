"use client";

import { useEffect } from "react";

import { reportBoundaryError } from "@/lib/analytics/report-error";
import { RETRY_LATER } from "@/lib/domain/messages";
import { reloadForStaleBuild } from "@/lib/navigation/stale-build";

/**
 * 루트 레이아웃까지 무너졌을 때. 이 파일이 레이아웃을 대신하므로 html·body 를 직접 그린다.
 *
 * 전역 스타일이 닿지 않아 Tailwind 클래스가 듣지 않는다. 색과 여백을 인라인으로 적는다.
 * 아이콘 스프라이트도 레이아웃에 있어 쓸 수 없다.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportBoundaryError(error, "global");
    reloadForStaleBuild(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "56px 16px",
          backgroundColor: "#FFFFFF",
          color: "#212124",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <title>문제가 생겼어요 · Poudy</title>

        {/* 글자는 ErrorState 와 같게 16/700 · 13 · 12 로 쓴다(text-section · body-sm · caption 과 행간까지 같다). */}
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.4, fontWeight: 700 }}>문제가 생겼어요</p>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#72747A", textAlign: "center" }}>{RETRY_LATER}</p>

        <button
          type="button"
          onClick={retry}
          style={{
            marginTop: 8,
            height: 44,
            padding: "0 20px",
            borderRadius: 12,
            border: "1px solid #DDE0E4",
            backgroundColor: "#FFFFFF",
            fontSize: 14,
            fontWeight: 700,
            color: "#212124",
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>

        {error.digest ? (
          <p style={{ marginTop: 8, fontSize: 12, lineHeight: 1.4, color: "#868B94" }}>오류 코드 {error.digest}</p>
        ) : null}
      </body>
    </html>
  );
}
