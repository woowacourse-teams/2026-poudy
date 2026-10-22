"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { Button } from "./button";
import { cn } from "./cn";
import { Icon } from "./icon";
import { LiveMessage } from "./live-message";
import { useDelayedFlag, useSlowFlag } from "./use-delayed-flag";

/** 목록 끝 자리의 문구. 기본은 제품 목록의 문구다(명세 APP · 목록 더 불러오기 상태). */
export type LoadMoreMessages = {
  readonly loading: (loaded: string, total: string) => string;
  readonly failed: string;
  readonly slow: string;
  readonly retry: string;
  /** 크롤러 링크의 글. 사람에게는 보이지 않는다. */
  readonly next: string;
  readonly previous: string;
  readonly previousLoading: string;
  readonly previousFailed: string;
};

const PRODUCT_MESSAGES: LoadMoreMessages = {
  loading: (loaded, total) => `${loaded} / ${total} · 다음 제품 불러오는 중`,
  failed: "다음 제품을 불러오지 못했어요",
  slow: "시간이 조금 걸리고 있어요",
  retry: "다시 시도",
  next: "다음 제품 보기",
  previous: "이전 제품 보기",
  previousLoading: "불러오는 중…",
  previousFailed: "이전 제품을 불러오지 못했어요",
};

type Common = {
  /**
   * 크롤러가 따라갈 그 장의 주소. 크롤러는 스크롤하지 않으므로 이 링크를 따라가야 다른 장의 항목에 닿는다.
   * 사람에게는 보이지 않고 키보드·낭독에서도 빠진다. 사람은 스크롤과 버튼으로 그 자리에 붙인다.
   */
  readonly href?: string;
  readonly messages?: Partial<LoadMoreMessages>;
  readonly className?: string;
};

export type LoadMoreProps =
  | (Common & {
      /** 목록 끝. 다음 장 */
      readonly direction: "next";
      /**
       * - idle: 더 부를 장이 있다. 이 자리가 화면에 닿으면 onLoad 를 저절로 부른다.
       * - loading: 부르는 중. 300ms 뒤 스피너와 개수를 보이고, 10초가 지나면 [다시 시도]를 함께 둔다(F02).
       * - end: 마지막 장까지 불렀다. 더 부르지 않고, 문구 없이 목록 아래 여백만 남긴다.
       * - failed: 부르지 못했다. 저절로 다시 부르지 않고, [다시 시도]를 눌러야만 onRetry 를 부른다.
       */
      readonly status: "idle" | "loading" | "end" | "failed";
      readonly loadedCount: number;
      readonly totalCount: number;
      readonly onLoad: () => void;
      readonly onRetry: () => void;
    })
  | (Common & {
      /**
       * 목록 맨 위. 중간 장으로 들어왔을 때만 둔다(명세 APP · 이전 제품 보기). 위로 스크롤해도 부르지 않고, 버튼을 눌러야만
       * onLoad 를 부른다. 붙인 뒤 보던 항목의 자리를 지키는 것과 첫 장에 닿으면 이 자리를 빼는 것은 목록이 맡는다.
       */
      readonly direction: "previous";
      readonly status: "idle" | "loading" | "failed";
      readonly onLoad: () => void;
    });

const formatCount = (value: number) => value.toLocaleString("ko-KR");

/** 크롤러에게만 보이는 장 링크 */
const CrawlerLink = ({ href, children }: { readonly href: string; readonly children: string }) => (
  <a href={href} tabIndex={-1} aria-hidden="true" className="sr-only">
    {children}
  </a>
);

/**
 * 목록의 앞뒤 장을 불러오는 자리(명세 APP · 목록 더 불러오기 상태 · 불러오는 중 · 마지막 · 실패, APP · 이전 제품 보기).
 * 다음 장은 스크롤로 저절로 부르고, 실패 뒤 다시 시도와 이전 장은 버튼으로만 부른다. 저절로 API 를 다시 부르지 않는다.
 *
 * 마지막 장에 닿으면 아무것도 보이지 않는다. 실패 문구는 polite 로 한 번 알린다. 불러오는 중의 단계는 알리지 않는다(A11Y D06). 기다리는 목록에는
 * 목록 쪽이 aria-busy 를 단다(F02).
 */
export function LoadMore(props: LoadMoreProps) {
  const messages = { ...PRODUCT_MESSAGES, ...props.messages };
  return props.direction === "next" ? (
    <NextPage {...props} messages={messages} />
  ) : (
    <PreviousPage {...props} messages={messages} />
  );
}

function NextPage({
  status,
  loadedCount,
  totalCount,
  onLoad,
  onRetry,
  href,
  messages,
  className,
}: Extract<LoadMoreProps, { readonly direction: "next" }> & { readonly messages: LoadMoreMessages }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onLoadRef = useRef(onLoad);
  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  // 화면에 닿으면 다음 장을 부른다. idle 일 때만 지켜본다. 실패한 뒤에는 다시 닿아도 부르지 않는다.
  useEffect(() => {
    const target = rootRef.current;
    if (!target || status !== "idle") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadRef.current();
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [status]);

  const loading = status === "loading";
  const showLoading = useDelayedFlag(loading);
  const slow = useSlowFlag(loading);

  let content: ReactNode;
  if (status === "end") {
    // 끝을 따로 알리지 않는다. 자리(위 20 · 아래 8)는 남겨 마지막 항목이 화면 아래에 붙지 않게 한다.
    content = null;
  } else if (status === "failed") {
    content = (
      <>
        <p aria-hidden="true" className="text-body-sm leading-snug text-text-secondary">
          {messages.failed}
        </p>
        <LiveMessage>{messages.failed}</LiveMessage>
        <Button variant="secondary" onClick={onRetry}>
          {messages.retry}
        </Button>
      </>
    );
  } else if (slow) {
    content = (
      <>
        <p aria-hidden="true" className="text-body-sm leading-snug text-text-secondary">
          {messages.slow}
        </p>
        <LiveMessage>{messages.slow}</LiveMessage>
        <Button variant="secondary" onClick={onRetry}>
          {messages.retry}
        </Button>
      </>
    );
  } else {
    // 아직 보이지 않는 동안에도 같은 높이의 자리를 비워 둔다. 스피너가 켜져도 아래가 밀리지 않는다.
    content = (
      <p
        className={cn(
          "flex items-center gap-1 text-body-sm leading-snug text-text-secondary",
          !showLoading && "invisible",
        )}
      >
        <Icon name="loader-2" size={16} scalable className="shrink-0 animate-spinner" />
        {messages.loading(formatCount(loadedCount), formatCount(totalCount))}
      </p>
    );
  }

  return (
    <div ref={rootRef} className={cn("flex flex-col items-center gap-2 pt-5 pb-2", className)}>
      {content}
      {href && status !== "end" ? <CrawlerLink href={href}>{messages.next}</CrawlerLink> : null}
    </div>
  );
}

function PreviousPage({
  status,
  onLoad,
  href,
  messages,
  className,
}: Extract<LoadMoreProps, { readonly direction: "previous" }> & { readonly messages: LoadMoreMessages }) {
  const loading = status === "loading";

  return (
    <div className={cn("flex flex-col items-center gap-2 py-2", className)}>
      {status === "failed" ? (
        <>
          <p aria-hidden="true" className="text-body-sm leading-snug text-text-secondary">
            {messages.previousFailed}
          </p>
          <LiveMessage>{messages.previousFailed}</LiveMessage>
        </>
      ) : null}
      <Button variant="secondary" busy={loading} onClick={onLoad}>
        {/* 라벨이 바뀌어도 버튼 폭은 두 라벨 중 긴 쪽에 맞춰 그대로 둔다(STATE 처리 중). */}
        <span className="grid">
          <span aria-hidden={loading} className={cn("col-start-1 row-start-1", loading && "invisible")}>
            {messages.previous}
          </span>
          <span aria-hidden={!loading} className={cn("col-start-1 row-start-1", !loading && "invisible")}>
            {messages.previousLoading}
          </span>
        </span>
      </Button>
      {href ? <CrawlerLink href={href}>{messages.previous}</CrawlerLink> : null}
    </div>
  );
}
