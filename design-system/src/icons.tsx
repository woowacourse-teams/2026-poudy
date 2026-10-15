/**
 * 패키지 부품이 안에서만 쓰는 아이콘. Tabler(https://tabler.io/icons, MIT)의 24×24 그림을 옮겼다.
 *
 * 아이콘 부품(Icon)은 #729 에서 패키지로 옮긴다. 그 전까지 부품에 꼭 필요한 그림만 여기 두고 밖으로 내보내지 않는다.
 * 선 굵기는 viewBox 기준 2 다. 20 으로 그리면 1.67, 16 으로 그리면 1.33 이 되어 명세의 굵기와 맞는다.
 */
const PATHS = {
  search: ["M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0", "M21 21l-6 -6"],
  x: ["M18 6l-12 12", "M6 6l12 12"],
  "chevron-down": ["M6 9l6 6l6 -6"],
  check: ["M5 12l5 5l10 -10"],
  "circle-check": ["M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0", "M9 12l2 2l4 -4"],
} as const;

export type GlyphName = keyof typeof PATHS;

export function Glyph({
  name,
  size,
  strokeWidth = 2,
  className,
}: {
  readonly name: GlyphName;
  readonly size: number;
  /** viewBox(24) 기준 굵기. 그려지는 굵기는 size / 24 를 곱한 값이다. */
  readonly strokeWidth?: number;
  readonly className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
