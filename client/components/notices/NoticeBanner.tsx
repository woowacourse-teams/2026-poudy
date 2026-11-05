"use client";

import type { NoticeBannersResponse } from "@poudy/api/api.zod";
import { TopStrip } from "@poudy/design-system/top-strip";
import Link from "next/link";
import { useEffect, useState } from "react";

import { findNoticeBanners } from "@/lib/api/notices";

/** 닫을 때 돌던 공지 ID 들. 새로 띠를 켠 공지가 생기면 다시 띄운다. */
const DISMISSED = "poudy:notice-banner:dismissed:v2";
/** 한 공지를 보여 주는 시간(명세 APP · 공지 띠). */
const ROTATE_MS = 3000;
const MAX_ITEMS = 10;

type Item = NoticeBannersResponse["items"][number];

const readDismissed = (): readonly string[] => {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(DISMISSED) ?? "[]");
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

const writeDismissed = (ids: readonly string[]) => {
  try {
    window.localStorage.setItem(DISMISSED, JSON.stringify(ids));
  } catch {
    /* 저장이 막혀도 이 화면에서 닫힌 것은 상태로 남는다. */
  }
};

/**
 * 화면 맨 위의 공지 띠(명세 APP · 공지 띠).
 *
 * 띠를 켠 공지가 여러 개면 3초마다 다음 공지로 넘긴다. 손가락이나 포인터가 올라와 있거나 키보드 포커스가 있으면 멈추고,
 * 화면이 숨겨진 동안에도 넘기지 않는다. 바뀔 때 읽어 주지 않는 대신 영역 이름에 개수를 붙여 여러 개임을 알린다.
 * 다른 공지는 공지사항 목록에서 본다.
 *
 * ✕ 를 누르면 그때 돌던 공지들을 기기에 기억해 다시 띄우지 않는다. 새로 띠를 켠 공지가 생기면 다시 나타난다.
 */
export function NoticeBanner() {
  const [items, setItems] = useState<readonly Item[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState({ pointer: false, focus: false });

  useEffect(() => {
    let active = true;
    findNoticeBanners()
      .then((data) => {
        if (!active) return;
        const latest = data.items.slice(0, MAX_ITEMS);
        const dismissed = new Set(readDismissed());
        setItems(latest.some((item) => !dismissed.has(item.id)) ? latest : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const stopped = paused.pointer || paused.focus;
  useEffect(() => {
    if (items.length < 2 || stopped) return;
    const timer = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % items.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [items.length, stopped]);

  if (!items.length) return null;
  const current = items[index % items.length];

  return (
    <div
      onPointerEnter={() => setPaused((p) => ({ ...p, pointer: true }))}
      onPointerLeave={() => setPaused((p) => ({ ...p, pointer: false }))}
      onFocusCapture={() => setPaused((p) => ({ ...p, focus: true }))}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused((p) => ({ ...p, focus: false }));
      }}
    >
      <TopStrip
        label={items.length > 1 ? `공지 알림, ${items.length}개` : "공지 알림"}
        tone="brand"
        icon="speakerphone"
        action={{ asChild: <Link href={`/notices/${current.id}`} /> }}
        onClose={() => {
          writeDismissed(items.map((item) => item.id));
          setItems([]);
        }}
        closeLabel="공지 알림 닫기"
      >
        {current.text}
      </TopStrip>
    </div>
  );
}
