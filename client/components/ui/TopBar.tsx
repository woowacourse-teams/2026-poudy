"use client";

import { useRouter } from "next/navigation";

import { Icon } from "./icons/Icon";

type TopBarProps = {
  readonly title: string;
  /** 루트는 제목만, 하위는 뒤로가기와 제목을 보여 준다. */
  readonly variant: "root" | "sub";
  /** 루트 제목에 뒤로가기를 함께 두는 화면이 있다(디자인 S09·S11). */
  readonly showBack?: boolean;
  readonly right?: React.ReactNode;
};

/**
 * 디자인의 상단 영역. 이름은 8 가지였지만 구조는 두 종류뿐이다.
 * 하위 화면은 좌우 균형을 맞춰 제목을 가운데 둔다.
 */
export function TopBar({ title, variant, right, showBack = false }: TopBarProps) {
  const router = useRouter();

  if (variant === "root") {
    return (
      <header className="flex h-14 items-center gap-1 px-1">
        {showBack ? (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="뒤로 가기"
            className="flex size-11 shrink-0 items-center justify-center"
          >
            <Icon name="chevron-left" size={22} />
          </button>
        ) : null}

        <h1 className={`flex-1 text-[20px] font-bold text-text-primary ${showBack ? "" : "px-3"}`}>{title}</h1>
        {right}
      </header>
    );
  }

  return (
    <header className="flex h-[44px] items-center px-1">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="뒤로 가기"
        className="flex size-11 items-center justify-center"
      >
        <Icon name="chevron-left" size={20} />
      </button>

      <h1 className="flex-1 text-center text-[16px] font-semibold text-text-primary">{title}</h1>

      {/* 왼쪽 버튼과 같은 크기로 오른쪽을 채워 제목을 가운데 맞춘다. */}
      <span className="flex size-11 items-center justify-center">{right}</span>
    </header>
  );
}
