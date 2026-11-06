"use client";

import Link from "next/link";

export default function YouTubeError({ retry }: { readonly retry: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-gutter py-6">
      <p role="alert" className="text-14">
        유튜버 정보를 불러오지 못했어요.
      </p>
      <button type="button" className="min-h-11 rounded-lg bg-action px-6 text-14 text-action-text" onClick={retry}>
        다시 시도
      </button>
      <Link href="/" className="text-14 underline">
        홈으로
      </Link>
    </main>
  );
}
