"use client";

import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import Image from "next/image";
import { useState } from "react";

import type { YouTubeChannel } from "@/lib/api/youtube";
import { channelAvatarUrl } from "@/lib/youtube-format";

/**
 * 프로필 원의 크기와 사진이 없을 때 이니셜의 글자 크기. 상세 상단 내비 32, 목록 행 48, 홈 유튜버 줄 56, 상세 채널 정보 64.
 * 클래스 이름을 이어 붙여 만들지 않도록 표로 둔다.
 */
const AVATAR_SIZE = {
  32: "size-8 text-body",
  48: "size-12 text-section",
  56: "size-14 text-body",
  64: "size-16 text-hero",
} as const;

export type ChannelAvatarSize = keyof typeof AVATAR_SIZE;

/**
 * 채널 프로필 원. 사진이 없거나 받지 못하면 ui-brand-soft 원에 채널 이름의 첫 글자를 둔다.
 * 쓰는 자리마다 옆에 채널 이름이 있어 낭독에서 감춘다. 첫 글자가 이름 앞에 한 번 더 읽히지 않게 한다.
 */
export function ChannelAvatar({
  channel,
  size,
  className,
}: {
  readonly channel: Pick<YouTubeChannel, "name" | "profileImageUrl">;
  readonly size: ChannelAvatarSize;
  readonly className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft leading-none font-bold text-text-secondary",
        AVATAR_SIZE[size],
        className,
      )}
    >
      {channel.profileImageUrl && !failed ? (
        <Image
          src={channelAvatarUrl(channel.profileImageUrl)}
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

/** 썸네일 칸. 영상 탭의 영상 머리 96×54, 제품 상세의 영상 출처 줄 64×36. */
const THUMB_SIZE = {
  md: "h-13.5 w-24",
  sm: "h-9 w-16",
} as const;

/**
 * 영상 썸네일과 가운데 재생 표지(검은 원 18 · 재생 12). 썸네일이 없거나 받지 못하면 ui-surface 면에 재생 표지만 둔다.
 * 누르는 동작은 감싸는 쪽이 정한다. 썸네일은 영상 제목이 옆에 있어 alt 를 비운다.
 */
export function VideoThumbnail({
  src,
  size,
  className,
}: {
  readonly src: string | null;
  readonly size: keyof typeof THUMB_SIZE;
  readonly className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface",
        THUMB_SIZE[size],
        className,
      )}
    >
      {src && failedSrc !== src ? (
        <Image
          src={src}
          alt=""
          fill
          unoptimized
          sizes={size === "md" ? "96px" : "64px"}
          className="object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : null}
      <span className="relative flex size-4.5 items-center justify-center rounded-full bg-action text-action-text">
        <Icon name="player-play" size={12} />
      </span>
    </span>
  );
}
