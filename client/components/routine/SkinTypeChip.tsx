import type { SkinType } from "@poudy/api/api.zod";
import { Tag } from "@poudy/design-system/tag";

import { profileLabel, SKIN_KINDS } from "@/lib/domain/member-profile";

/** 닉네임 옆 피부 타입 표지(RT8·RT9·RT12). 입력하지 않았으면 그리지 않는다. */
export function SkinTypeChip({ skinType }: { readonly skinType: SkinType | null }) {
  const label = profileLabel(SKIN_KINDS, skinType);
  if (!label) return null;
  return (
    <Tag variant="label" tone="muted">
      {label}
    </Tag>
  );
}
