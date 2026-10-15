/**
 * 미리보기에서만 쓰는 아이콘. 앱의 Icon 은 client 에 있어 가져오지 않고, 같은 Tabler 그림을 옮겨 둔다.
 */
const PATHS = {
  x: ["M18 6l-12 12", "M6 6l12 12"],
  "chevron-right": ["M9 6l6 6l-6 6"],
  share: [
    "M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0",
    "M15 6a3 3 0 1 0 6 0a3 3 0 1 0 -6 0",
    "M15 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0",
    "M8.7 10.7l6.6 -3.4",
    "M8.7 13.3l6.6 3.4",
  ],
} as const;

type IconProps = {
  readonly name: keyof typeof PATHS;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly className?: string;
};

export function Icon({ name, size = 20, strokeWidth = 1.5, className }: IconProps) {
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
