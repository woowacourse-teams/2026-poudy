import { Icon } from "@poudy/design-system/icon";
import { Tag } from "@poudy/design-system/tag";

/** 공개 여부 표지(RT2·RT4). 공개는 파란 태그에 지구, 나만 보기는 회색 태그에 자물쇠다. */
export function RoutineVisibility({ isPublic }: { readonly isPublic: boolean }) {
  return (
    <Tag
      variant="label"
      tone={isPublic ? "info" : "muted"}
      icon={<Icon name={isPublic ? "world" : "lock"} size={14} scalable />}
    >
      {isPublic ? "공개" : "나만 보기"}
    </Tag>
  );
}
