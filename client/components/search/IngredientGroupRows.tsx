import { ConditionButton } from "@/components/ui/ConditionButton";
import { type GroupConditionKey, groupLabel, type IngredientGroup } from "@/lib/domain/ingredient-groups";

type IngredientGroupRowsProps = {
  readonly groups: readonly IngredientGroup[];
  readonly includedCodes: readonly string[];
  readonly excludedCodes: readonly string[];
  readonly onToggle: (key: GroupConditionKey, group: IngredientGroup) => void;
  readonly rowClassName: string;
};

export function IngredientGroupRows({
  groups,
  includedCodes,
  excludedCodes,
  onToggle,
  rowClassName,
}: IngredientGroupRowsProps) {
  return (
    <>
      {groups.map((group) => {
        const label = groupLabel(group);

        return (
          <li key={`group-${group.code}`} className={rowClassName}>
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="line-clamp-2 text-[14px] font-semibold text-text-primary">{label}</span>
              <span className="flex h-[18px] w-fit items-center rounded-[9px] bg-brand-soft px-1.5 text-[10px] font-semibold text-brand">
                성분군
              </span>
            </span>

            <span className="flex shrink-0 gap-1.5">
              <ConditionButton
                kind="include"
                active={includedCodes.includes(group.code)}
                ingredientName={label}
                onClick={() => onToggle("includeGroupCodes", group)}
              />
              <ConditionButton
                kind="exclude"
                active={excludedCodes.includes(group.code)}
                ingredientName={label}
                onClick={() => onToggle("excludeGroupCodes", group)}
              />
            </span>
          </li>
        );
      })}
    </>
  );
}
