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
  "chevron-left": ["M15 6l-6 6l6 6"],
  check: ["M5 12l5 5l10 -10"],
  "circle-check": ["M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0", "M9 12l2 2l4 -4"],
  "alert-circle": ["M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0 -20z", "M12 8l0 4", "M12 16l.01 0"],
  "info-circle": ["M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0", "M12 9h.01", "M11 12h1v4h1"],
  "loader-2": ["M12 3a9 9 0 1 0 9 9"],
  rotate: ["M19.95 11a8 8 0 1 0 -.5 4m.5 5v-5h-5"],
  sparkles: [
    "M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2z",
    "M16 6a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2z",
    "M9 18a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z",
  ],
  "thumb-up": [
    "M7 11v8a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1v-7a1 1 0 0 1 1 -1h3a4 4 0 0 0 4 -4v-1a2 2 0 0 1 4 0v5h3a2 2 0 0 1 2 2l-1 5a2 3 0 0 1 -2 2h-7a3 3 0 0 1 -3 -3",
  ],
  "thumb-down": [
    "M7 13v-8a1 1 0 0 0 -1 -1h-2a1 1 0 0 0 -1 1v7a1 1 0 0 0 1 1h3a4 4 0 0 1 4 4v1a2 2 0 0 0 4 0v-5h3a2 2 0 0 0 2 -2l-1 -5a2 3 0 0 0 -2 -2h-7a3 3 0 0 0 -3 3",
  ],
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
