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
            <span className="flex min-w-0 flex-1 flex-col gap-0.75">
              <span className="line-clamp-2 text-body font-semibold text-text-primary">{label}</span>
              <span className="flex h-4.5 w-fit items-center rounded-full bg-brand-soft px-1.5 text-label font-semibold text-brand">
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
