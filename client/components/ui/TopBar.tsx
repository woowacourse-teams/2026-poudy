"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { Icon } from "./icons/Icon";

type TopBarProps = {
  readonly title: string;
  /** 루트는 제목만, 하위는 뒤로가기와 제목을 보여 준다. */
  readonly variant: "root" | "sub";
  /** 루트 제목에 뒤로가기를 함께 두는 화면이 있다(디자인 S09·S11). */
  readonly showBack?: boolean;
  /** 제목 앞에 로고를 둘지. 홈처럼 서비스를 대표하는 화면에서 쓴다. */
  readonly showLogo?: boolean;
  /** 앱에서는 네이티브 상단바가 이 자리를 대신하므로 접는다. */
  readonly hiddenInApp?: boolean;
  readonly right?: React.ReactNode;
};

/**
 * 디자인의 상단 영역. 이름은 8 가지였지만 구조는 두 종류뿐이다.
 * 하위 화면은 좌우 균형을 맞춰 제목을 가운데 둔다.
 */
export function TopBar({
  title,
  variant,
  right,
  showBack = false,
  showLogo = false,
  hiddenInApp = false,
}: TopBarProps) {
  const router = useRouter();
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.replace("/");
  };

  if (variant === "root") {
    return (
      <header className="flex h-14 items-center gap-1 px-1">
        {showBack ? (
          <button
            type="button"
            onClick={handleBack}
            aria-label="뒤로 가기"
            className="flex size-11 shrink-0 items-center justify-center"
          >
            <Icon name="chevron-left" size={22} />
          </button>
        ) : null}

        {/* 제목이 이름을 전하므로 그림에는 대체 텍스트를 비운다. */}
        {showLogo ? (
          <Image
            src="/logo.png"
            alt=""
            width={26}
            height={29}
            priority
            className="ml-3 mb-1.5 self-end h-[29px] w-[26px]"
          />
        ) : null}

        {/*
          로고가 첫 글자 p 를 대신한다. 로고에 바로 이어 붙어 한 낱말로 읽히도록
          사이를 띄우지 않고 전용 글꼴을 쓴다.
          아래를 기준으로 맞추되 헤더 바닥에 닿지 않도록 둘 다 같은 만큼 띄운다.

          Foldit 은 글자에 색이 박힌 글꼴이라 color 대신 팔레트로 색을 맞춘다.
        */}
        <h1
          className={
            showLogo
              ? "font-brand -ml-1.5 flex-1 self-end pb-1.5 text-[26px] leading-none font-bold [font-optical-sizing:auto] [font-palette:--brand-fold]"
              : `min-w-0 flex-1 truncate text-[20px] font-bold text-text-primary ${showBack ? "" : "px-3"}`
          }
        >
          {title}
        </h1>
        {right}
      </header>
    );
  }

  return (
    <header data-app-hidden={hiddenInApp || undefined} className="flex h-[44px] items-center px-1">
      <button
        type="button"
        onClick={handleBack}
        aria-label="뒤로 가기"
        className="flex size-11 items-center justify-center"
      >
        <Icon name="chevron-left" size={20} />
      </button>

      {/* 이름을 그대로 받는 화면이 있다. 길어도 좌우 버튼을 밀지 않도록 넘치면 줄인다. */}
      <h1 className="min-w-0 flex-1 truncate text-center text-[16px] font-semibold text-text-primary">{title}</h1>

      {/* 왼쪽 버튼과 같은 크기로 오른쪽을 채워 제목을 가운데 맞춘다. */}
      <span className="flex size-11 items-center justify-center">{right}</span>
    </header>
  );
}
