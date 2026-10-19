"use client";

import { cn } from "./cn";
import { Icon } from "./icon";
import { LiveMessage } from "./live-message";
import { TextButton } from "./text-button";
import { usePressable } from "./use-pressable";

export type NoticeAction = {
  readonly label: string;
  readonly onClick: () => void;
};

export type NoticeProps = {
  /** 안내 문구. 무엇이 바뀌었는지 한두 문장으로 쓴다. */
  readonly children: string;
  /** 행동 글자 버튼. 0~2개(FEEDBACK F05). */
  readonly actions?: readonly [] | readonly [NoticeAction] | readonly [NoticeAction, NoticeAction];
  /** ✕ 를 누르면 부른다. 닫으면 같은 화면에서 다시 띄우지 않는다(F05). 그 기억은 화면이 맡는다. */
  readonly onClose: () => void;
  /** 닫기 버튼의 이름. 기본은 '안내 닫기'. */
  readonly closeLabel?: string;
  readonly className?: string;
};

/**
 * 본문 흐름 안(목록 위 등)에 붙는 안내 한 줄(명세 APP · 안내 줄, FEEDBACK F05).
 * 사용자가 직접 하지 않은 변경이나, 화면에 들어왔을 때 이미 적용된 상태를 알린다. 사라지지 않고 ✕ 로 닫을 때까지 남는다.
 * 사용자가 대응하지 않아도 되는 결과는 Toast 를, 결정을 받아야 하면 확인 시트를 쓴다.
 *
 * 문구는 화면에 그려진 뒤 polite 로 한 번 알린다(A11Y D06). 행동 버튼과 닫기는 보이는 높이 36·32 이지만 누르는 영역은 44 다.
 */
export function Notice({ children, actions = [], onClose, closeLabel = "안내 닫기", className }: NoticeProps) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg bg-info-soft py-2 pr-2 pl-4", className)}>
      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 gap-2 pt-2">
          {/* 칸은 문구 첫 줄의 높이(1lh)를 따르고 폭은 아이콘(em)이 정한다. 글자를 키워도 아이콘이 문구를 덮지 않는다. */}
          <span aria-hidden="true" className="flex h-lh shrink-0 items-center text-body-sm text-info-text">
            <Icon name="info-circle" size={16} scalable />
          </span>
          {/* 낭독은 LiveMessage 가 맡는다. 훑어 읽을 때 같은 문구를 두 번 읽지 않게 화면 글은 뺀다. */}
          <p aria-hidden="true" className="min-w-0 flex-1 text-body-sm text-text-primary">
            {children}
          </p>
          <LiveMessage>{children}</LiveMessage>
        </div>
        <CloseButton label={closeLabel} onClick={onClose} />
      </div>

      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-1 pl-4">
          {actions.map((action) => (
            <TextButton key={action.label} tone="info" onClick={action.onClick}>
              {action.label}
            </TextButton>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 안내 줄의 닫기. 보이는 칸은 32 원이고 누르는 영역은 44 다(A11Y D12).
 * 색 면 위라 한 단계 진한 면을 정할 수 없어, 32 원에 덮개를 얹는다(fb-overlay). 그래서 IconButton 대신 따로 둔다.
 */
function CloseButton({ label, onClick }: { readonly label: string; readonly onClick: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      aria-label={label}
      {...pressableProps}
      onClick={onClick}
      className="pressable fb-overlay flex size-8 shrink-0 items-center justify-center rounded-full text-text-muted before:absolute before:-inset-1.5"
    >
      <Icon name="x" size={16} />
    </button>
  );
}
