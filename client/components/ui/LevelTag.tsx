import { dropletFills, levelLabel } from "@/lib/domain/product-display";

type LevelTagProps = {
  readonly kind: "moisture" | "oil";
  readonly level: number;
};

const TEXT = {
  moisture: { label: "수분", filled: "text-droplet-moisture", empty: "text-droplet-empty" },
  oil: { label: "유분", filled: "text-droplet-oil", empty: "text-droplet-empty-oil" },
} as const;

/**
 * 유수분 레벨을 물방울 아이콘 3 칸으로 보여 준다.
 * 색과 모양만으로는 값을 알 수 없으므로 단계 이름을 함께 읽히게 한다.
 */
export function LevelTag({ kind, level }: LevelTagProps) {
  const { label, filled, empty } = TEXT[kind];

  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {dropletFills(level).map((isFilled, index) => (
          <Droplet key={index} className={isFilled ? filled : empty} />
        ))}
      </span>
      <span className={`text-[12px] font-semibold ${filled}`}>{label}</span>
      <span className="sr-only">{levelLabel(level)}</span>
    </span>
  );
}

function Droplet({ className }: { readonly className?: string }) {
  return (
    <svg className={className} width="8" height="10" viewBox="0 0 8 10" aria-hidden="true">
      <path d="M4 0C4 0 0 4.2 0 6.4A4 4 0 0 0 8 6.4C8 4.2 4 0 4 0Z" fill="currentColor" />
    </svg>
  );
}
