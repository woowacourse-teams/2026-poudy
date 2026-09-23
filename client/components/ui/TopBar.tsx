"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { Icon } from "./icons/Icon";

import { usePassedTopBoundary } from "@/lib/hooks/usePassedTopBoundary";
import { hasInSiteHistory } from "@/lib/navigation/history-depth";

type TopBarProps = {
  readonly title: string;
  /** 루트는 제목만, 하위는 뒤로가기와 제목을 보여 준다. */
  readonly variant: "root" | "sub";
  /** 루트 제목에 뒤로가기를 함께 두는 화면이 있다(디자인 S09·S11). */
  readonly showBack?: boolean;
  /** 제목 앞에 로고를 둘지. 홈처럼 서비스를 대표하는 화면에서 쓴다. */
  readonly showLogo?: boolean;
  /**
   * 로고만 두고 이름 글자는 그리지 않을지(디자인 S01 홈).
   *
   * 글자가 사라지면 서비스 이름을 읽을 자리가 없어지므로 로고가 그 몫을 대신한다.
   * 그림에 대체 텍스트를 주고 제목은 화면에서만 감춘다.
   */
  readonly logoOnly?: boolean;
  /**
   * 바 제목을 문서의 대표 제목으로 둘지. 본문에 진짜 제목이 있는 화면은 `p` 로 내린다.
   * 그리는 모양은 그대로고 문서 구조만 바뀐다.
   */
  readonly titleAs?: "h1" | "p";
  readonly right?: React.ReactNode;
  /**
   * 스크롤하면 바 아래에 선을 그을지. 바 아래에 다른 것이 함께 붙는 화면은 그쪽이 선을
   * 맡으므로 끈다. 바에도 그으면 붙은 것 위아래로 선이 두 줄 생긴다.
   */
  readonly edge?: boolean;
  /** 다른 sticky 묶음 안에서 그릴 때는 그 묶음이 붙는 일을 맡는다. */
  readonly sticky?: boolean;
};

/*
 * 스크롤해도 화면 위에 남는다. `fixed` 는 쓰지 않는다. 본문이 `max-width` 로 가운데 놓인
 * 카드라 폭이 화면 전체로 벌어지고, 흐름에서 빠진 높이만큼 본문 윗여백을 따로 메워야 한다.
 * 바텀시트의 딤(z-40)·시트(z-50)보다 아래에 둔다.
 */
const STICKY = "sticky top-0 z-30 bg-background";

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

export function TopBar({
  title,
  variant,
  right,
  showBack = false,
  showLogo = false,
  logoOnly = false,
  titleAs = "h1",
  edge = true,
  sticky = true,
}: TopBarProps) {
  const Title = titleAs;
  const edgeEnabled = sticky && edge;
  const { ref, passed } = usePassedTopBoundary<HTMLDivElement>({ enterAt: 0, enabled: edgeEnabled });
  const position = sticky ? STICKY : "relative z-10 bg-background";
  const edgeClass = edgeEnabled ? "stuck-edge" : "";
  const sentinel = edgeEnabled ? <div ref={ref} aria-hidden="true" /> : null;

  if (variant === "root") {
    return (
      <>
        {sentinel}
        <header
          data-top-bar
          data-stuck={edgeEnabled ? passed : undefined}
          className={`${position} ${edgeClass} flex h-14 items-center gap-1 px-1`}
        >
          {showBack ? (
            <BackControl iconSize={22} className="flex size-11 shrink-0 items-center justify-center" />
          ) : null}

          {/*
            이름 글자가 함께 있으면 제목이 이름을 전하므로 그림에는 대체 텍스트를 비운다.
            로고만 둘 때는 읽을 글자가 없어 그림이 그 몫을 대신한다.
          */}
          {showLogo ? (
            /*
              이름 글자와 나란히 설 때는 글자의 아랫줄에 맞춰야 한 낱말로 읽힌다.
              로고만 둘 때는 맞출 글자가 없으므로 바 높이를 채우고 가운데에 선다.
            */
            <Image
              src="/logo.png"
              alt={logoOnly ? title : ""}
              width={80}
              height={89}
              draggable={false}
              loading="eager"
              className={
                logoOnly ? "ml-3 h-9 w-auto shrink-0 select-none" : "ml-3 mb-1.5 h-[29px] w-[26px] select-none self-end"
              }
            />
          ) : null}

          {/*
            로고가 첫 글자 p 를 대신한다. 로고에 바로 이어 붙어 한 낱말로 읽히도록
            사이를 띄우지 않고 전용 글꼴을 쓴다.
            아래를 기준으로 맞추되 헤더 바닥에 닿지 않도록 둘 다 같은 만큼 띄운다.

            Foldit 은 글자에 색이 박힌 글꼴이라 color 대신 팔레트로 색을 맞춘다.

            로고만 두는 화면은 그림이 이미 이름을 읽어 주므로 제목을 화면에서만 감춘다.
            문서에는 대표 제목이 남아 구조가 무너지지 않는다.
          */}
          {logoOnly ? (
            <Title className="sr-only">{title}</Title>
          ) : (
            <Title
              className={
                showLogo
                  ? "font-brand -ml-1.5 flex-1 cursor-default select-none self-end pb-1.5 text-[26px] leading-none font-bold [font-optical-sizing:auto] [font-palette:--brand-fold]"
                  : `min-w-0 flex-1 truncate text-[20px] font-bold text-text-primary ${showBack ? "" : "px-3"}`
              }
            >
              {showLogo ? <span className="sr-only">P</span> : null}
              {title}
            </Title>
          )}

          {/* 제목이 자리를 채우지 않으므로 오른쪽 것을 끝으로 밀어 둔다. */}
          {logoOnly ? <span className="flex-1" /> : null}
          {right}
        </header>
      </>
    );
  }

  return (
    <>
      {sentinel}
      <header
        data-top-bar
        data-stuck={edgeEnabled ? passed : undefined}
        className={`${position} ${edgeClass} flex h-[44px] items-center px-1`}
      >
        <BackControl iconSize={20} className="flex size-11 items-center justify-center" />

        <Title className="min-w-0 flex-1 truncate text-center text-[16px] font-semibold text-text-primary">
          {title}
        </Title>

        <span className="flex size-11 items-center justify-center">{right}</span>
      </header>
    </>
  );
}
