"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { Icon } from "./icons/Icon";

import { hasInSiteHistory } from "@/lib/navigation/history-depth";

type TopBarProps = {
  readonly title: string;
  /** 루트는 제목만, 하위는 뒤로가기와 제목을 보여 준다. */
  readonly variant: "root" | "sub";
  /** 루트 제목에 뒤로가기를 함께 두는 화면이 있다(디자인 S09·S11). */
  readonly showBack?: boolean;
  /** 제목 앞에 로고를 둘지. 홈처럼 서비스를 대표하는 화면에서 쓴다. */
  readonly showLogo?: boolean;
  readonly right?: React.ReactNode;
};

/* 방문 기록은 스스로 알려 오지 않는다. 그릴 때마다 그때의 기록을 읽는다. */
const subscribe = () => () => {};

/* 서버에는 방문 기록이 없다. 미리 만든 화면은 기록이 있는 쪽으로 그린다. */
const serverSnapshot = () => false;

/**
 * 뒤로 가기 자리. 방문 기록이 없으면 홈으로 가는 링크가 대신 선다.
 *
 * `뒤로 가기` 라는 이름은 이전 화면으로 돌아간다고 말한다. 기록이 없어 홈으로 보내면서
 * 그 이름을 그대로 두면 화면 낭독기를 쓰는 사람은 눌러 본 뒤에야 어디로 갔는지 안다.
 * 정해진 주소로 가는 일이므로 역할도 단추가 아니라 링크다.
 *
 * 방문 기록은 브라우저에만 있어 미리 만들어 둔 화면은 기록이 있는 쪽으로 그려진다.
 * 붙은 뒤에 실제 기록을 보고 이름과 역할을 바꾼다. 그림은 바꾸지 않는다. 바꾸면 이미
 * 그려진 화면에서 화살표가 집으로 뒤바뀌어, 밖에서 바로 들어온 사람에게만 깜빡인다.
 */
function BackControl({ iconSize, className }: { readonly iconSize: number; readonly className: string }) {
  const router = useRouter();
  const toHome = useSyncExternalStore(subscribe, () => !hasInSiteHistory(), serverSnapshot);

  /* 한 화면에 머무는 동안 기록이 늘 수 있어 누르는 순간 다시 살핀다. */
  const handleBack = () => {
    if (hasInSiteHistory()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  if (toHome) {
    return (
      // 기록을 늘리지 않도록 지금 화면을 대신한다. router.replace 와 같은 자리다.
      <Link href="/" replace aria-label="홈으로" className={className}>
        <Icon name="chevron-left" size={iconSize} />
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleBack} aria-label="뒤로 가기" className={className}>
      <Icon name="chevron-left" size={iconSize} />
    </button>
  );
}

export function TopBar({ title, variant, right, showBack = false, showLogo = false }: TopBarProps) {
  if (variant === "root") {
    return (
      <header className="flex h-14 items-center gap-1 px-1">
        {showBack ? <BackControl iconSize={22} className="flex size-11 shrink-0 items-center justify-center" /> : null}

        {/* 제목이 이름을 전하므로 그림에는 대체 텍스트를 비운다. */}
        {showLogo ? (
          <Image
            src="/logo.png"
            alt=""
            width={26}
            height={29}
            draggable={false}
            loading="eager"
            className="ml-3 mb-1.5 select-none self-end h-[29px] w-[26px]"
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
              ? "font-brand -ml-1.5 flex-1 cursor-default select-none self-end pb-1.5 text-[26px] leading-none font-bold [font-optical-sizing:auto] [font-palette:--brand-fold]"
              : `min-w-0 flex-1 truncate text-[20px] font-bold text-text-primary ${showBack ? "" : "px-3"}`
          }
        >
          {showLogo ? <span className="sr-only">P</span> : null}
          {title}
        </h1>
        {right}
      </header>
    );
  }

  return (
    <header className="flex h-[44px] items-center px-1">
      <BackControl iconSize={20} className="flex size-11 items-center justify-center" />

      <h1 className="min-w-0 flex-1 truncate text-center text-[16px] font-semibold text-text-primary">{title}</h1>

      <span className="flex size-11 items-center justify-center">{right}</span>
    </header>
  );
}
