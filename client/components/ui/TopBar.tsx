"use client";

import { useRouter } from "next/navigation";

import { Icon } from "./icons/Icon";

type TopBarProps = {
  readonly title: string;
  /** 루트는 제목만, 하위는 뒤로가기와 제목을 보여 준다. */
  readonly variant: "root" | "sub";
  readonly right?: React.ReactNode;
};

/**
 * 디자인의 상단 영역. 이름은 8 가지였지만 구조는 두 종류뿐이다.
 * 하위 화면은 좌우 균형을 맞춰 제목을 가운데 둔다.
 */
export function TopBar({ title, variant, right }: TopBarProps) {
  const router = useRouter();

  if (variant === "root") {
    return (
      <header className="flex h-[52px] items-center justify-between px-4">
        <h1 className="text-[20px] font-bold text-text-primary">{title}</h1>
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
