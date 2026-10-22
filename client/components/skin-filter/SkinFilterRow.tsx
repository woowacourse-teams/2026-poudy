import { IconButton } from "@poudy/design-system/icon-button";

import { IngredientRow, type IngredientRowProps } from "@/components/ingredient/IngredientRow";
import { Icon } from "@/components/ui/icons/Icon";
import { excludeGroupName } from "@/lib/domain/exclude-codes";

type SkinFilterRowProps = Pick<IngredientRowProps, "name" | "effects" | "formulationRoles"> & {
  /** 이 성분이 속한 주의 성분군 코드 */
  readonly cautionCodes?: readonly string[];
  readonly action: "remove" | "add";
  readonly onAction: () => void;
};

const ACTION = {
  remove: { icon: "minus", label: (name: string) => `${name} 필터에서 빼기` },
  add: { icon: "plus", label: (name: string) => `${name} 필터에 넣기` },
} as const;

/**
 * 나만의 필터의 성분 행(S55j). 성분 검색 결과와 같은 성분 행(IngredientRow)에 끝의 빼기(−)나 넣기(+) 버튼을 둔다.
 */
export function SkinFilterRow({ cautionCodes = [], action, onAction, ...row }: SkinFilterRowProps) {
  return (
    // 빼거나 넣은 성분은 다른 묶음에 새로 그려진다. 순간 이동처럼 보이지 않게 옅게 나타난다. 자리를 옮기는 움직임은 두지 않는다(M02).
    <li className="transition-opacity duration-(--duration-fast) ease-out starting:opacity-0">
      <IngredientRow
        {...row}
        cautions={cautionCodes.map((code) => ({ code, name: excludeGroupName(code) }))}
        action={
          // 누르는 영역은 44 이고 보이는 원은 36 이다. 성분 검색 결과 행의 담기 버튼과 같은 자리에 둔다.
          <span className="shrink-0">
            <IconButton
              label={ACTION[action].label(row.name)}
              onClick={onAction}
              icon={
                <span className="flex size-9 items-center justify-center rounded-full border border-border-strong">
                  <Icon name={ACTION[action].icon} size={20} strokeWidth={2} />
                </span>
              }
            />
          </span>
        }
      />
    </li>
  );
}
