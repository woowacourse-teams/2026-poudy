import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { Tag } from "@poudy/design-system/tag";

/**
 * 공개 여부 표지(RT2·RT4). 공개는 파란 태그에 지구, 나만 보기는 회색 태그에 자물쇠다.
 * 회색 면 위(루틴 탭의 내 루틴 줄 카드, S173)에서는 면이 섞이지 않게 흰 면에 같은 글자색으로 그린다(onSurface).
 */
export function RoutineVisibility({
  isPublic,
  onSurface = false,
}: {
  readonly isPublic: boolean;
  readonly onSurface?: boolean;
}) {
  const icon = <Icon name={isPublic ? "world" : "lock"} size={14} scalable />;
  const label = isPublic ? "공개" : "나만 보기";

  if (onSurface) {
    return (
      <span
        className={cn(
          "inline-flex min-h-6 shrink-0 items-center gap-1 rounded-full bg-background px-2 py-0.5 text-label leading-none font-bold [&_svg]:shrink-0",
          isPublic ? "text-info-text" : "text-text-secondary",
        )}
      >
        {icon}
        {label}
      </span>
    );
  }

  return (
    <Tag variant="label" tone={isPublic ? "info" : "muted"} icon={icon}>
      {label}
    </Tag>
  );
}
