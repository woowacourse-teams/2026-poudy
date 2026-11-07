import Image from "next/image";

/**
 * 히어로(56)와 바 제목(24)의 크기. 그림은 히어로 크기로 한 번만 받아 CSS 크기만 달리한다(명세 S30).
 * 안쪽 여백은 히어로가 4(IMAGE P01), 바가 2 다. 바에 4 를 두면 테두리를 뺀 그림 폭이 18 에서 14 로 줄어 알아보기 어렵다.
 */
const SIZES = {
  hero: { box: "size-14 text-hero", image: "p-1" },
  bar: { box: "size-6 text-label", image: "p-0.5" },
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
 * 브랜드 원형 로고. 그림이 없으면 이름 첫 글자를 둔다(APP · 브랜드 행 · 이니셜 로고).
 *
 * 로고 그림은 가로로 긴 것이 많아 채우면 좌우가 잘린다. 전체가 들어오게 맞추고 안쪽을 띄운다.
 * 옆이나 아래에 이름이 있으므로 낭독하지 않는다(alt '').
 */
export function BrandMark({ name, imageUrl, size, loading }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background font-bold text-text-secondary ${SIZES[size].box}`}
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
