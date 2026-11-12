import { cn } from "@poudy/design-system/cn";
import Image from "next/image";

import { concernImageSrc } from "@/lib/domain/concerns";

/**
 * 고민 그림(S87 · S92). 회색 원(`layer`) 안에 인물 그림을 원의 아래 가운데에 붙여 둔다. 그림이 원 아래 둘레에서 잘려 어깨가
 * 원 안에 담긴다. 섹션은 원 84 · 그림 72, 시트 머리는 원 64 · 그림 56 이다.
 *
 * 그림은 꾸밈이라 대체 글을 비운다. 고민 이름은 옆이나 아래 글자가 알린다. hover 면은 부모가 `group` 으로 바꾼다.
 */
export function ConcernPicture({
  code,
  size,
  className,
}: {
  readonly code: string;
  readonly size: "section" | "sheet";
  readonly className?: string;
}) {
  const src = concernImageSrc(code);

  return (
    <span
      className={cn(
        "flex shrink-0 items-end justify-center overflow-hidden rounded-full bg-layer transition-colors duration-(--duration-fast)",
        size === "section" ? "size-21" : "size-16",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={size === "section" ? 72 : 56}
          height={size === "section" ? 72 : 56}
          className={size === "section" ? "size-18" : "size-14"}
        />
      ) : null}
    </span>
  );
}
