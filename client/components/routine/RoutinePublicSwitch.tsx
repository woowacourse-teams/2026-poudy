import { Icon } from "@poudy/design-system/icon";
import { SwitchIndicator } from "@poudy/design-system/switch";
import { usePressable } from "@poudy/design-system/use-pressable";

type RoutinePublicSwitchProps = {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly busy?: boolean;
  /** 스위치 아래 설명. 새 루틴 시트는 두지 않고 더보기 시트에만 둔다(RT3·RT7). */
  readonly description?: string;
  /** 더보기 시트처럼 다른 메뉴 줄과 나란히 둘 때 앞에 지구 아이콘을 붙인다. */
  readonly withIcon?: boolean;
};

/** '다른 사람에게 공개' 스위치 행(RT3·RT7). 행 전체를 눌러 켜고 끈다. */
export function RoutinePublicSwitch({
  checked,
  onChange,
  busy = false,
  description,
  withIcon = false,
}: RoutinePublicSwitchProps) {
  const { pressableProps } = usePressable({ busy });

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={busy || undefined}
      {...pressableProps}
      onClick={() => onChange(!checked)}
      className="pressable flex w-full items-center gap-3 py-3 text-left select-none"
    >
      {withIcon ? (
        <span aria-hidden="true" className="flex shrink-0 text-text-body">
          <Icon name="world" size={20} />
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body font-semibold text-text-primary">다른 사람에게 공개</span>
        {description ? <span className="text-caption text-text-secondary">{description}</span> : null}
      </span>
      <SwitchIndicator checked={checked} />
    </button>
  );
}
