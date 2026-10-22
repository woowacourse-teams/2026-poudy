import type { ReactNode } from "react";

import { hasVisibleLabel } from "./accessible-name";
import { cn } from "./cn";

/**
 * 입력 한 칸의 틀(명세 S40b 의 입력 섹션). 라벨, 입력, 그 아래 안내나 오류 문구를 세로로 놓는다.
 * TextField·TextArea·Select 가 안에서 쓰고 밖으로 내보내지 않는다.
 *
 * - 라벨은 14/700 이다. 필수가 기본이라 표시하지 않고, 고르지 않아도 되는 칸에만 '선택'을 붙인다.
 * - 안내와 오류는 같은 자리에 놓는다. 오류가 있으면 안내 대신 오류를 보여 준다.
 * - 문구 자리는 비어 있어도 한 줄 높이를 지킨다. 오류가 생겨도 아래 내용이 밀리지 않는다(STATE S06).
 *   안내도 오류도 생기지 않는 칸은 reserveMessage 를 꺼서 이 자리를 두지 않는다.
 * - 라벨이 없으면 라벨 줄만 빼고 그린다. 이름은 부품이 aria-label 이나 aria-labelledby 로 붙인다.
 */
export function FieldFrame({
  label,
  labelFor,
  labelId,
  optional,
  messageId,
  hint,
  error,
  reserveMessage = true,
  className,
  children,
}: {
  readonly label: ReactNode;
  /** 라벨이 가리킬 입력의 id. 버튼처럼 이름을 aria-labelledby 로 받는 칸은 비운다. */
  readonly labelFor?: string;
  readonly labelId: string;
  readonly optional: boolean;
  readonly messageId: string;
  readonly hint?: ReactNode;
  readonly error?: string;
  /** 비어 있는 문구 자리를 지킬지. 안내도 오류도 생기지 않는 칸만 끈다. */
  readonly reserveMessage?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  const visible = hasVisibleLabel(label);
  const message = error ?? hint;
  const labelContent = (
    <>
      <span className="text-body font-bold text-text-primary">{label}</span>
      {optional ? <span className="text-body-sm text-text-secondary">선택</span> : null}
    </>
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {!visible ? null : labelFor ? (
        <label id={labelId} htmlFor={labelFor} className="flex items-baseline gap-1">
          {labelContent}
        </label>
      ) : (
        <span id={labelId} className="flex items-baseline gap-1">
          {labelContent}
        </span>
      )}

      {children}

      {/* 칸을 벗어나며 생긴 오류도 읽어 주도록 바뀌는 문구를 알린다. */}
      {reserveMessage || message ? (
        <p
          id={messageId}
          aria-live="polite"
          className={cn("field-message text-caption", error ? "text-danger-action" : "text-text-secondary")}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
