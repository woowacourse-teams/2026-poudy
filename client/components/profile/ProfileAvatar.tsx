"use client";

import { cn } from "@poudy/design-system/cn";
import Image from "next/image";
import { useState } from "react";

/** 사진이 없거나 읽히지 않으면 같은 크기의 기본 사람 그림을 보여 준다. 크기는 className 으로 정한다. */
export function ProfileAvatar({
  src,
  className = "size-20",
}: {
  readonly src: string | null;
  readonly className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-icon-subtle text-on-dark",
        className,
      )}
    >
      {src && failedSource !== src ? (
        <Image
          src={src}
          alt=""
          width={96}
          height={96}
          unoptimized
          className="size-full object-cover"
          onError={() => setFailedSource(src)}
        />
      ) : (
        <svg viewBox="0 0 96 96" aria-hidden="true" className="size-full fill-current">
          <circle cx="48" cy="38" r="18" />
          <ellipse cx="48" cy="86" rx="32" ry="22" />
        </svg>
      )}
    </span>
  );
}
