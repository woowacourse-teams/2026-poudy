"use client";

import { Icon } from "@poudy/design-system/icon";
import Image from "next/image";
import { useState } from "react";

/** 사진이 없거나 읽히지 않으면 같은 크기의 기본 아이콘을 보여 준다. */
export function ProfileAvatar({ src }: { readonly src: string | null }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  return (
    <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-text-secondary">
      {src && failedSource !== src ? (
        <Image
          src={src}
          alt=""
          width={80}
          height={80}
          unoptimized
          className="size-full object-cover"
          onError={() => setFailedSource(src)}
        />
      ) : (
        <Icon name="user" size={28} />
      )}
    </span>
  );
}
