import { cn } from "@poudy/design-system/cn";
import Image from "next/image";

/**
 * 히어로(56)와 바 제목(24)의 크기. 그림은 히어로 크기로 한 번만 받아 CSS 크기만 달리한다(명세 S30).
 * 안쪽 여백은 히어로가 4(IMAGE P01), 바가 2 다. 바에 4 를 두면 테두리를 뺀 그림 폭이 18 에서 14 로 줄어 알아보기 어렵다.
 */
const SIZES = {
  // 히어로는 회색 면(bg-surface) 위라, 그림 없는 이니셜 원을 흰 면으로 두어 묻히지 않게 한다(APP · 브랜드 행 · 이니셜 로고의 회색 면 위 규칙).
  hero: { box: "size-14 text-hero", image: "p-1", initial: "bg-background" },
  bar: { box: "size-6 text-label", image: "p-0.5", initial: "bg-surface" },
} as const;

/** 받는 그림의 폭. 두 자리가 같은 주소를 쓰도록 히어로 크기로 고정한다. */
const IMAGE_WIDTH = 56;

type BrandMarkProps = {
  readonly name: string;
  readonly imageUrl?: string | null;
  readonly size: keyof typeof SIZES;
  readonly loading?: "eager" | "lazy";
};

/**
 * 브랜드 원형 로고. 그림이 없으면 이름 첫 글자를 둔다. 그 원은 디렉터리 행의 이니셜 로고처럼 테두리가 없다
 * (명세 S308 · APP · 브랜드 행 · 이니셜 로고). 흰 바 위에서는 회색 면, 회색 히어로 위에서는 흰 면이다.
 *
 * 로고 그림은 흰 바탕에 그린 것이 많아 흰 원에 테두리를 둔다. 가로로 긴 것이 많아 채우면 좌우가 잘리므로,
 * 전체가 들어오게 맞추고 안쪽을 띄운다. 옆이나 아래에 이름이 있으므로 낭독하지 않는다(alt '').
 */
export function BrandMark({ name, imageUrl, size, loading }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-text-secondary",
        imageUrl ? "border border-border bg-background" : SIZES[size].initial,
        SIZES[size].box,
      )}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          width={IMAGE_WIDTH}
          height={IMAGE_WIDTH}
          loading={loading}
          className={`size-full object-contain ${SIZES[size].image}`}
        />
      ) : (
        name.trim().charAt(0)
      )}
    </span>
  );
}
