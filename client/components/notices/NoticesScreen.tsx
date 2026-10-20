"use client";

import type { NoticeResponse, NoticePageResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { NoticeBody } from "./NoticeBody";

import { findNotice, findNotices, recordNoticeView } from "@/lib/api/notices";

export function NoticesScreen({ id }: { readonly id?: string }) {
  const [notice, setNotice] = useState<NoticeResponse | null>(null);
  const [list, setList] = useState<NoticePageResponse | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(false);
  const counted = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    const request = id ? findNotice(id) : findNotices(page);
    request
      .then((data) => {
        if (!active) return;
        setError(false);
        if ("items" in data) setList(data);
        else {
          setNotice(data);
          if (counted.current !== data.id) {
            counted.current = data.id;
            recordNoticeView(data.id).catch(() => {});
          }
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      counted.current = null;
    };
  }, [id, page]);
  return (
    <main className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 items-center gap-4 border-b border-border px-4">
        <Link href={id ? "/notices" : "/"} aria-label="뒤로" className="flex size-11 items-center">
          〈
        </Link>
        <h1 className="flex-1 text-center text-bar font-bold">공지사항</h1>
        <span className="size-11" />
      </header>
      {error ? (
        <p role="alert" className="p-5">
          공지를 불러오지 못했어요. 비공개로 전환되었거나 삭제되었을 수 있어요.
        </p>
      ) : id ? (
        notice?.id === id ? (
          <article className="space-y-5 px-5 py-8">
            <div>
              <h2 className="text-24 leading-snug font-bold">{notice.title}</h2>
              <p className="mt-2 text-13 text-text-muted">
                {notice.firstPublishedAt &&
                  new Date(notice.firstPublishedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
              </p>
            </div>
            <NoticeBody content={notice.content} imageIds={notice.images.map((i) => i.imageId)} noticeId={notice.id} />
          </article>
        ) : (
          <p role="status" className="p-5">
            불러오는 중이에요.
          </p>
        )
      ) : list ? (
        <>
          <ul className="divide-y divide-border">
            {list.items.map((item) => (
              <li key={item.id}>
                <Link href={`/notices/${item.id}`} className="block space-y-2 px-5 py-5">
                  <p className="text-body font-semibold">{item.title}</p>
                  <p className="text-caption text-text-muted">
                    {item.firstPublishedAt &&
                      new Date(item.firstPublishedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {!list.items.length && <p className="p-5 text-text-muted">등록된 공지가 없어요.</p>}
          <nav className="flex justify-center gap-6 py-6" aria-label="공지 페이지">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              이전
            </button>
            <span>{page}</span>
            <button type="button" disabled={!list.pagination.hasNext} onClick={() => setPage((p) => p + 1)}>
              다음
            </button>
          </nav>
        </>
      ) : (
        <p role="status" className="p-5">
          불러오는 중이에요.
        </p>
      )}
    </main>
  );
}
