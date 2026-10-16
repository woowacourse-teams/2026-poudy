import type { SkinEffectResponse } from "@poudy/api/api.zod";
import { IconButton } from "@poudy/design-system/icon-button";

import { EffectIcon, effectLabel } from "@/components/ingredient/EffectTag";
import { Icon } from "@/components/ui/icons/Icon";

type SkinFilterRowProps = {
  readonly name: string;
  /** 이름 아래 줄. 제형 기능이 없으면 비워 둔다. */
  readonly note?: string;
  readonly effects?: readonly SkinEffectResponse[];
  readonly action: "remove" | "add";
  readonly onAction: () => void;
};

const ACTION = {
  remove: { icon: "minus", label: (name: string) => `${name} 필터에서 빼기` },
  add: { icon: "plus", label: (name: string) => `${name} 필터에 넣기` },
} as const;

/**
 * 나만의 필터의 성분 행(S55j). 이름과 작용 아이콘, 제형 기능, 끝에 빼기(−)나 넣기(+) 버튼을 둔다.
 *
 * 명세는 이름 옆에 주의 성분군 아이콘(향료/알레르기 성분, 건조 알코올 등)도 그린다. 필터 응답에 성분군이 없어 아직 그리지 않는다.
 */
export function SkinFilterRow({ name, note, effects = [], action, onAction }: SkinFilterRowProps) {
  return (
    <li className="flex items-center gap-3 border-b border-border py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-title font-semibold text-text-primary">{name}</span>
          {effects.length > 0 ? (
            <span className="flex shrink-0 items-center gap-0.5 text-text-secondary">
              {effects.map((effect) => (
                <EffectIcon key={effect.id} code={effect.code} size={14} />
              ))}
              <span className="sr-only">{effects.map(effectLabel).join(", ")}</span>
            </span>
          ) : null}
        </div>
        {note ? <p className="text-body-sm text-text-secondary">{note}</p> : null}
      </div>
      {/* 누르는 영역은 44 이고 보이는 원은 36 이다. 원의 끝이 화면 여백 선에 오도록 바깥으로 4 민다. */}
      <span className="-mr-1 shrink-0">
        <IconButton
          label={ACTION[action].label(name)}
          onClick={onAction}
          icon={
            <span className="flex size-9 items-center justify-center rounded-full border border-border-strong">
              <Icon name={ACTION[action].icon} size={20} strokeWidth={2} />
            </span>
          }
        />
      </span>
    </li>
  );
}
