"use client";

import type { ReactNode } from "react";

import { cn } from "./cn";
import { Icon } from "./icon";
import { LiveMessage } from "./live-message";
import { TextButton } from "./text-button";

export type ErrorStateProps =
  | {
      /**
       * 화면 전체를 불러오지 못했거나(S51) 연결이 끊겼거나(S51b) 없는 주소일 때(S51c). 본문 가운데에 아이콘 · 제목 · 설명 ·
       * 행동 · 작은 오류 코드를 둔다. 상단 내비와 하단 내비는 화면이 남겨 다른 곳으로 갈 수 있게 한다.
       * 낭독은 화면 제목처럼 읽힌다. 포커스를 옮기거나 role=alert 로 끼어들지 않는다(S51).
       */
      readonly variant: "screen";
      /** 위에 둘 아이콘 하나(ICON 강조 28). 캐릭터 일러스트는 쓰지 않는다. */
      readonly icon?: ReactNode;
      readonly title: ReactNode;
      /** 무슨 일인지와 다음 행동. 줄바꿈 문자(\n)는 그대로 줄을 나눈다. */
      readonly description?: ReactNode;
      /** [다시 시도] 같은 행동 하나. Button variant="secondary" 를 넘긴다. */
      readonly action?: ReactNode;
      /** 서버 로그와 맞춰 볼 오류 코드(Next 의 digest). 없는 주소에는 두지 않는다. */
      readonly code?: string;
      readonly className?: string;
    }
  | {
      /**
       * 화면의 한 섹션만 불러오지 못했을 때(S51a). 그 섹션 자리에 한 줄 오류와 [다시 시도]를 둔다.
       * 나머지 화면은 그대로 쓸 수 있다. 섹션 제목은 남겨 어느 섹션이 실패했는지 보이게 한다.
       * 문구는 그려진 뒤 polite 로 한 번 알린다(A11Y D06).
       */
      readonly variant: "section";
      /** '○○을 불러오지 못했어요' */
      readonly children: string;
      /** 그 섹션만 다시 요청한다. */
      readonly onRetry: () => void;
      readonly retryLabel?: string;
      readonly className?: string;
    };

/**
 * 데이터를 불러오지 못했을 때의 모양(명세 FEEDBACK F06, S51 계열). 모양만 맡고, 언제 보여 줄지는 화면이 정한다.
 * 화면 전체 오류는 app/error.tsx, 없는 주소는 not-found.tsx 가 variant="screen" 으로 그린다.
 *
 * 결과가 0개인 것은 오류가 아니다. 그때는 EmptyState 를 쓴다.
 */
export function ErrorState(props: ErrorStateProps) {
  if (props.variant === "section") {
    const { children, onRetry, retryLabel = "다시 시도", className } = props;
    return (
      <div className={cn("flex items-center gap-2 rounded-lg bg-surface px-4 py-3", className)}>
        <Icon name="alert-circle" size={16} scalable className="shrink-0 text-text-secondary" />
        <p aria-hidden="true" className="min-w-0 flex-1 text-body-sm text-text-body">
          {children}
        </p>
        <LiveMessage>{children}</LiveMessage>
        <TextButton tone="neutral" onClick={onRetry}>
          {retryLabel}
        </TextButton>
      </div>
    );
  }

  const { icon, title, description, action, code, className } = props;
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-gutter py-10 text-center", className)}>
      {icon ? (
        <span aria-hidden="true" className="mb-2 flex text-text-secondary [&>svg]:size-7">
          {icon}
        </span>
      ) : null}
      <h2 className="text-section font-bold text-text-primary">{title}</h2>
      {description ? <p className="text-body-sm whitespace-pre-line text-text-secondary">{description}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
      {code ? <p className="text-caption text-text-muted">오류 코드 {code}</p> : null}
    </div>
  );
}
