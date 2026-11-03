import { SwitchIndicator } from "@poudy/design-system/switch";
import { usePressable } from "@poudy/design-system/use-pressable";

type RoutinePublicSwitchProps = {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly busy?: boolean;
};

/** '다른 사람에게 공개' 스위치 행(RT3·RT7). 행 전체를 눌러 켜고 끈다. */
export function RoutinePublicSwitch({ checked, onChange, busy = false }: RoutinePublicSwitchProps) {
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
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body font-semibold text-text-primary">다른 사람에게 공개</span>
        <span className="text-caption text-text-secondary">둘러보기에 보이고, 로그인하지 않아도 볼 수 있어요</span>
      </span>
      <SwitchIndicator checked={checked} />
    </button>
  );
}
