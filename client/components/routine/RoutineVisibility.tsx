import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";

/** 공개 여부 표지(RT2·RT4). 공개는 초록 면에 지구, 나만 보기는 회색 면에 자물쇠다. */
export function RoutineVisibility({ isPublic }: { readonly isPublic: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-caption leading-none font-semibold",
        isPublic ? "bg-success-soft text-success-text" : "bg-surface text-text-secondary",
      )}
    >
      <Icon name={isPublic ? "world" : "lock"} size={14} />
      {isPublic ? "공개" : "나만 보기"}
    </span>
  );
}
