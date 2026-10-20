"use client";

import type { NoticeBannersResponse } from "@poudy/api/api.zod";
import { useEffect, useState } from "react";

import { NoticeBannerLine } from "./NoticeBannerLine";

import { findNoticeBanners } from "@/lib/api/notices";

const DISMISSED = "poudy:notice-banner:dismissed:v1";
export function NoticeBanner() {
  const [items, setItems] = useState<NoticeBannersResponse["items"]>([]);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    let active = true;
    try {
      if (sessionStorage.getItem(DISMISSED) === "true") return;
    } catch {
      /* 저장소가 막혀도 현재 화면에서 닫을 수 있다. */
    }
    findNoticeBanners()
      .then((data) => {
        if (active) setItems(data.items.slice(0, 10));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (items.length < 2 || focused || dismissed) return;
    const timer = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % items.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [items.length, focused, dismissed]);
  if (dismissed || !items.length) return null;
  const current = items[index % items.length];
  return (
    <section
      aria-label="공지 알림"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <NoticeBannerLine
        text={current.text}
        href={`/notices/${current.id}`}
        current={(index % items.length) + 1}
        total={items.length}
        onNext={() => setIndex((i) => (i + 1) % items.length)}
        onClose={() => {
          setDismissed(true);
          try {
            window.sessionStorage.setItem(DISMISSED, "true");
          } catch {
            /* 현재 화면의 상태는 유지한다. */
          }
        }}
      />
    </section>
  );
}
