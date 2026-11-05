"use client";

import type { YouTubeChannelResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import Image from "next/image";
import { useState } from "react";

export function ChannelAvatar({
  channel,
  small = false,
}: {
  readonly channel: YouTubeChannelResponse;
  readonly small?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft font-bold text-text-secondary",
        small ? "size-8 text-14" : "size-16 text-24",
      )}
    >
      {channel.profileImageUrl && !failed ? (
        <Image
          src={channel.profileImageUrl}
          alt=""
          fill
          unoptimized
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        channel.name.slice(0, 1)
      )}
    </span>
  );
}

/** 채널 배너가 없거나 로딩에 실패하면 기존 단색 배경을 유지한다. */
export function ChannelBanner({ src, backdrop = false }: { readonly src: string | null; readonly backdrop?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  if (!src || failedSrc === src) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "overflow-hidden bg-brand-soft",
        backdrop ? "absolute inset-0" : "relative mt-4 block h-28 rounded-xl",
      )}
    >
      <Image
        src={src}
        alt=""
        fill
        unoptimized
        sizes="480px"
        className={cn("object-cover", backdrop && "blur-sm")}
        onError={() => setFailedSrc(src)}
      />
      {backdrop && <span className="absolute inset-0 bg-background/65" />}
    </span>
  );
}

export function RecommendationBadge({ count }: { readonly count: number }) {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-sm bg-brand-soft px-1.5 py-1 text-12 font-semibold text-brand-text">
      추천 {count}회
    </span>
  );
}

export function PlayIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={cn("size-4 shrink-0", className)}
    >
      <path d="m8 5 11 7-11 7Z" strokeLinejoin="round" />
    </svg>
  );
}
