import type { ReactNode, Ref } from "react";

import { cn } from "./cn";

export type EmptyStateProps = {
  /** 위에 둘 아이콘 하나(ICON 강조 28). 너무 비어 보일 때만 둔다. */
  readonly icon?: ReactNode;
  /** 무엇이 없는지. 처음이면 '아직 ○○이 없어요', 검색이면 입력어를 인용한다(F03). */
  readonly title: ReactNode;
  /** 어떻게 채우거나 고쳐 볼 수 있는지. 줄바꿈 문자(\n)는 그대로 줄을 나눈다. */
  readonly description?: ReactNode;
  /** 행동 하나. Button variant="secondary" 를 넘긴다(F03). 너비는 글자에 맞춘다. */
  readonly action?: ReactNode;
  /**
   * 제목. 목록의 마지막 항목을 지워 목록이 비면 포커스를 여기로 옮긴다(A11Y D10). 그래서 제목은 tabIndex -1 을 갖는다.
   */
  readonly titleRef?: Ref<HTMLParagraphElement>;
  readonly className?: string;
};

/**
 * 화면은 정상이고 보여 줄 결과만 0개일 때(명세 FEEDBACK F03 빈 상태). 제목 → 설명 → 행동 하나 순서다.
 * '없다'는 사실보다 다음에 할 수 있는 일을 보여 준다.
 *
 * - 캐릭터 일러스트는 쓰지 않는다. 문구와 행동만 두고, 너무 비어 보이면 아이콘 하나를 위에 둔다.
 * - 데이터를 불러오지 못했으면 이 부품이 아니라 ErrorState 를 쓴다. 비었다고 할 수 있는 것은 받은 뒤뿐이다.
 * - 결과 수와 '결과 없음'을 알리는 라이브 영역은 결과 영역(목록을 감싼 쪽)이 맡는다(A11Y D06).
 * - 남은 자리의 가운데에 두려면 className 에 flex-1 을 준다.
 */
export function EmptyState({ icon, title, description, action, titleRef, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-2 py-10 text-center", className)}>
      {/* 아이콘과 제목 사이는 12 다. 형제 사이의 8 보다 넓어 둘을 한 칸에 묶고 그 칸의 간격으로 띄운다(LAYOUT L09). */}
      <div className="flex flex-col items-center gap-3">
        {icon ? (
          <span aria-hidden="true" className="flex text-text-secondary [&>svg]:size-7">
            {icon}
          </span>
        ) : null}
        <p ref={titleRef} tabIndex={-1} className="text-section font-bold text-text-primary outline-none">
          {title}
        </p>
      </div>
      {description ? <p className="text-body whitespace-pre-line text-text-secondary">{description}</p> : null}
      {/* 설명과 행동 사이는 16 이다(F03). */}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
