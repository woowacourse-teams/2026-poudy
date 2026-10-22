"use client";

import { cva } from "class-variance-authority";
import { cloneElement } from "react";
import type { ReactElement, ReactNode } from "react";

import { cn } from "./cn";
import { Icon } from "./icon";
import type { IconName } from "./icon";
import { IconButton } from "./icon-button";
import { BOUNDARY_MARKER, usePassedTop, useScreen } from "./screen";
import { Slot } from "./slot";
import { usePressable } from "./use-pressable";

/**
 * 뒤로가기. 누르면 할 일(onClick)을 넘기거나, 정해진 주소로 가는 링크(asChild)를 넘긴다.
 * 방문 기록이 없어 홈으로 보낼 때처럼 이동이 정해진 경우는 링크로 넘기고 이름도 그 일에 맞게 바꾼다('홈으로').
 */
export type TopBarBack =
  | {
      readonly onClick: () => void;
      /** 이름. 기본은 '이전 화면'(A11Y D05) */
      readonly label?: string;
      readonly asChild?: undefined;
    }
  | {
      /** 뒤로가기 자리에 그릴 링크(client 의 Link) 하나. 안의 내용은 바가 그린다. */
      readonly asChild: ReactElement;
      readonly label?: string;
      readonly onClick?: undefined;
    };

/** 아이콘만 있는 행동 버튼(공유·도움말·추가). IconButton(ghost)으로 그린다. */
export type TopBarIconAction = {
  readonly icon: IconName;
  /** 대상이 드러나는 이름. 예: '{성분명} 공유', '선반 설명 보기'(A11Y D05) */
  readonly label: string;
  readonly onClick: () => void;
  /** 시트나 메뉴를 여는 버튼이면 그 종류와 열림 상태를 알린다. */
  readonly haspopup?: "dialog" | "menu";
  readonly expanded?: boolean;
};

/**
 * 제목 자리를 잠시 다른 내용으로 바꿔 보인다. 본문의 제목이 스크롤로 내비 아래에 가려졌을 때 무엇을 보고 있는지
 * 알리는 데 쓴다(S24-1 제품 사진 28 + 제품명). 바꾸는 때(active)는 화면이 정한다.
 */
export type TopBarTitleSwap = {
  /** 제목 대신 보일 내용. 한 줄에 들어가게 화면이 줄인다. */
  readonly content: ReactNode;
  readonly active: boolean;
};

/** 글자 행동 버튼. 하위 내비 오른쪽의 '초기화'처럼 짧은 글자 하나다. */
export type TopBarTextAction = {
  readonly text: string;
  readonly onClick: () => void;
};

type TitleProps = {
  /** 보통은 글자다. 브랜드 상세처럼 스크롤에 따라 로고와 이름으로 바뀌는 제목은 화면이 그려 넘긴다. */
  readonly title: ReactNode;
  /**
   * 제목을 문서의 대표 제목으로 둘지. 본문에 진짜 제목이 있는 화면은 p 로 내린다. 모양은 그대로다.
   */
  readonly titleAs?: "h1" | "p";
  /**
   * 붙었을 때 아래 선을 그을지. 바 아래에 다른 줄이 함께 붙어 그쪽이 선을 맡는 화면은 끈다. 둘 다 그으면 선이 두 줄 생긴다.
   */
  readonly edge?: boolean;
};

export type TopBarProps = TitleProps &
  (
    | {
        /** 하위 화면의 공통 내비(높이 44). 뒤로가기 · 가운데 제목 · 오른쪽 행동 하나 */
        readonly variant: "sub";
        readonly back: TopBarBack;
        readonly action?: TopBarIconAction | TopBarTextAction;
        readonly titleSwap?: TopBarTitleSwap;
        readonly align?: undefined;
        readonly actions?: undefined;
      }
    | {
        /**
         * 탐색 앱바(높이 56). 카테고리 상품·브랜드 상세처럼 큰 제목 앱바(56)에서 들어오는 화면이라 높이를 맞춘다.
         * 제목은 카테고리 경로 맥락이면 왼쪽(start), 아니면 가운데(center)다.
         */
        readonly variant: "explore";
        readonly back: TopBarBack;
        readonly align: "start" | "center";
        readonly action?: undefined;
        readonly titleSwap?: undefined;
        readonly actions?: undefined;
      }
    | {
        /** 탭 첫 화면의 큰 제목 내비(20/700). 오른쪽 아이콘 버튼은 0~2개다. */
        readonly variant: "large";
        readonly actions?: readonly [] | readonly [TopBarIconAction] | readonly [TopBarIconAction, TopBarIconAction];
        readonly back?: undefined;
        readonly action?: undefined;
        readonly titleSwap?: undefined;
        readonly align?: undefined;
      }
  );

/*
 * 바 공통. 스크롤해도 위에 남고(sticky), 붙은 동안에만 아래 선이 나타난다. 같은 면 안의 구분이라 그림자가 아니라
 * 테두리 색(ui-border)이다(SHAPE E03). 선은 처음부터 투명하게 두고 색만 바꾼다. 붙는 순간 선을 새로 그으면 아래가 밀린다.
 * 선은 바 아래 안쪽 1px 에 겹쳐 그려, 높이를 내용에 맞추는 큰 제목 내비도 높이가 명세(64)와 같다.
 */
const barVariants = cva(
  "sticky top-0 z-(--z-sticky) flex shrink-0 items-center bg-background after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-transparent after:transition-colors after:duration-(--duration-fast) data-stuck:after:bg-border",
  {
    variants: {
      variant: {
        sub: "h-11",
        explore: "h-14",
        // 위 8 · 오른쪽 6 · 아래 12 · 왼쪽 거터. 오른쪽을 6 으로 줄여 아이콘(24) 끝이 화면 끝 − 16 에 온다.
        large: "justify-between gap-2 pt-2 pr-1.5 pb-3 pl-(--gutter)",
      },
    },
  },
);

/*
 * 뒤로가기 칸. 꺾쇠(24)를 칸 왼쪽 8 에 두어, 꺾쇠의 안쪽 여백 8 과 합쳐 화면 끝 16 에 보이게 한다(LAYOUT L04 · L07).
 * 누르는 영역은 칸 전체(하위 56×44, 탐색 44×44)이고, 피드백 원(36)은 누르는 영역이 아니라 꺾쇠를 가운데에 둔다(STATE S04).
 */
const backVariants = cva(
  "pressable fb-circle flex shrink-0 items-center pl-0.5 text-text-primary select-none before:inset-y-1 before:left-0.5",
  {
    variants: {
      variant: {
        sub: "h-11 w-14 before:right-4.5",
        explore: "size-11 before:right-1.5",
      },
    },
  },
);

function BackButton({ back, variant }: { readonly back: TopBarBack; readonly variant: "sub" | "explore" }) {
  const { pressableProps } = usePressable();
  const label = back.label ?? "이전 화면";
  const className = backVariants({ variant });
  // 피드백 원과 같은 자리(왼쪽 2, 지름 36)에 꺾쇠를 가운데로 두면 꺾쇠가 왼쪽 8 에 온다.
  // 포커스 링은 누르는 칸이 아니라 이 원을 따른다(STATE S06).
  // 피드백 원(::before)은 위치를 가진 요소라 그냥 두면 꺾쇠 위에 칠해져 hover 때 꺾쇠가 가려진다. IconButton 처럼 relative 로 올린다.
  // 하위 바(sub)의 아이콘은 16 이다(10/22 결정). 지름 36 원 가운데에 두므로 꺾쇠의 가로 자리는 24 일 때와 거의 같다.
  const glyph = (
    <span data-focus-ring="" className="relative flex size-9 items-center justify-center rounded-full">
      <Icon name="chevron-left" size={variant === "sub" ? 16 : 24} />
    </span>
  );

  if (back.asChild) {
    return (
      <Slot {...pressableProps} aria-label={label} className={className}>
        {cloneElement(back.asChild as ReactElement<{ readonly children?: ReactNode }>, { children: glyph })}
      </Slot>
    );
  }

  return (
    <button type="button" aria-label={label} {...pressableProps} onClick={back.onClick} className={className}>
      {glyph}
    </button>
  );
}

function IconAction({ action, size = 24 }: { readonly action: TopBarIconAction; readonly size?: 16 | 24 }) {
  return (
    <IconButton
      variant="ghost"
      label={action.label}
      icon={<Icon name={action.icon} size={size} />}
      // 투명 버튼은 아이콘을 24 로 잡는다. 하위 바(16)에서는 그 크기를 덮어쓴다.
      className={size === 16 ? "[&>svg]:size-4" : undefined}
      onClick={action.onClick}
      aria-haspopup={action.haspopup}
      aria-expanded={action.haspopup ? Boolean(action.expanded) : undefined}
    />
  );
}

function TextAction({ action }: { readonly action: TopBarTextAction }) {
  const { pressableProps } = usePressable();
  return (
    <button
      type="button"
      {...pressableProps}
      onClick={action.onClick}
      className="pressable fb-surface flex h-11 min-w-14 items-center justify-end rounded-sm pr-4 pl-2 text-body-sm leading-none font-medium whitespace-nowrap text-text-secondary select-none"
    >
      {action.text}
    </button>
  );
}

/**
 * 바 제목의 글자. 하위 바(sub)는 16/600 으로 가볍게 두고(10/22 결정), 나머지는 17/700 이다.
 * 하위 화면이 많아 바가 화면마다 반복되므로 본문보다 눈에 띄지 않게 한다.
 */
const titleClass = (sub: boolean) => (sub ? "text-16 font-semibold" : "text-bar font-bold");

/*
 * 제목과 바꿔 보일 내용을 한 칸에 겹쳐 두고 불투명도로 바꾼다. 둘이 같은 자리를 쓰므로 바뀌어도 바 높이와 버튼 자리가
 * 그대로다. 바뀌는 쪽이 4px 위아래로 미끄러져 어느 쪽이 들어오는지 보인다(fast · ease-out). 움직임 줄이기에서는 불투명도만
 * 바꾼다. 숨은 쪽은 보조 기술에서도 감춘다.
 */
function SwappableTitle({
  Title,
  title,
  swap,
  sub,
}: {
  readonly Title: "h1" | "p";
  readonly title: ReactNode;
  readonly swap: TopBarTitleSwap;
  readonly sub: boolean;
}) {
  return (
    <div data-swapped={swap.active ? "" : undefined} className="group grid w-full min-w-0 grid-cols-1 items-center justify-items-center">
      <Title
        aria-hidden={swap.active || undefined}
        className={cn(
          "col-start-1 row-start-1 max-w-full min-w-0 truncate leading-none text-text-primary transition duration-(--duration-fast) ease-(--ease-out) group-data-swapped:opacity-0 motion-safe:group-data-swapped:-translate-y-1",
          titleClass(sub),
        )}
      >
        {title}
      </Title>
      <div
        aria-hidden={!swap.active || undefined}
        className="col-start-1 row-start-1 flex max-w-full min-w-0 items-center opacity-0 transition duration-(--duration-fast) ease-(--ease-out) group-data-swapped:opacity-100 motion-safe:translate-y-1 motion-safe:group-data-swapped:translate-y-0"
      >
        {swap.content}
      </div>
    </div>
  );
}

const isTextAction = (action: TopBarIconAction | TopBarTextAction): action is TopBarTextAction => "text" in action;

/**
 * 상단 내비(LAYOUT L04 · L09, 명세 APP · 상단 내비 · 하위 / 큰 제목, 탐색 앱바).
 *
 * 바가 버튼을 가진다. 화면은 버튼의 모양이나 자리를 고르지 않고, 무엇을 할지(back, action, actions)만 넘긴다.
 * 바깥 좌우 여백 없이 버튼 칸 안에서 아이콘이 화면 끝 16 에 보이게 맞춘다.
 *
 * - sub: 하위 화면. 뒤로가기 칸 56×44 · 가운데 제목(16/600) · 오른쪽 칸 56×44 에 아이콘 버튼 또는 글자 버튼 하나.
 *   아이콘은 16 이다. 명세 ZdlT8(17/700 · 아이콘 24)보다 가볍게 두기로 했다(10/22 결정). 바가 꽉 차 보이지 않는다.
 * - explore: 카테고리 상품·브랜드 상세. 높이 56, 뒤로가기 칸 44×44
 * - large: 탭 첫 화면. 큰 제목(20/700)과 오른쪽 아이콘 버튼 0~2개
 *
 * sub 와 explore 는 화면의 역할로 고른다. 목록을 둘러보며 제목이 그 화면의 이름인 화면은 explore 를, 무언가를 정하는
 * 작업 화면(탐색 조건, 성분 추가 등)은 sub 를 쓴다. 그래서 두 바의 높이(56 · 44)와 제목 정렬이 다르다. 꺾쇠의 가로 자리는
 * 둘 다 화면 끝 16 으로 같다.
 */
export function TopBar(props: TopBarProps) {
  const { title, titleAs = "h1", edge = true, variant } = props;
  const Title = titleAs;
  const screen = useScreen();
  // body 형 골격에서는 바가 스크롤 밖에 있어 붙는 일이 없다. 본문이 내려가면 선을 긋는다.
  const inBodyScreen = screen?.scroll === "body";
  const { ref, passed } = usePassedTop<HTMLDivElement>(undefined, edge && !inBodyScreen);
  const stuck = edge && (inBodyScreen ? screen.bodyScrolled : passed);

  const header = (() => {
    if (props.variant === "large") {
      return (
        <>
          <Title className="min-w-0 truncate text-screen font-bold text-text-primary">{title}</Title>
          {/* 버튼이 없어도 줄 높이(44)를 지켜, 화면마다 바 높이가 같다. */}
          <div className="flex min-h-11 shrink-0 items-center">
            {props.actions?.map((action) => (
              <IconAction key={action.label} action={action} />
            ))}
          </div>
        </>
      );
    }

    const centered = props.variant === "sub" || props.align === "center";
    return (
      <>
        <BackButton back={props.back} variant={props.variant} />
        <div className={cn("flex min-w-0 flex-1 items-center", centered ? "justify-center" : "justify-start")}>
          {props.titleSwap ? (
            <SwappableTitle Title={Title} title={title} swap={props.titleSwap} sub={props.variant === "sub"} />
          ) : (
            <Title className={cn("min-w-0 truncate leading-none text-text-primary", titleClass(props.variant === "sub"))}>
              {title}
            </Title>
          )}
        </div>
        {props.variant === "sub" ? (
          <div className="flex h-11 min-w-14 shrink-0 items-center justify-end">
            {props.action === undefined ? null : isTextAction(props.action) ? (
              <TextAction action={props.action} />
            ) : (
              // IconButton(44) 오른쪽을 2 띄워 아이콘(16) 끝이 화면 끝 16 에 보이게 한다(LAYOUT L07).
              <span className="pr-0.5">
                <IconAction action={props.action} size={16} />
              </span>
            )}
          </div>
        ) : centered ? (
          // 가운데 제목이 뒤로가기 칸만큼 밀리지 않게 오른쪽에 같은 폭의 빈 칸을 둔다.
          <span aria-hidden="true" className="size-11 shrink-0" />
        ) : null}
      </>
    );
  })();

  return (
    <>
      {/*
       * 붙는 바 앞의 표식. 붙었는지 아는 데 쓰고, 화면을 옮길 때 Next 가 새 화면의 첫 요소로 스크롤을 맞출 때도 쓰인다.
       * sticky 요소는 그 대상에서 빠져, 표식이 없으면 새 화면이 앞 화면에서 내려간 만큼 내려간 채 열린다.
       */}
      {inBodyScreen ? null : <div ref={ref} aria-hidden="true" className={BOUNDARY_MARKER} />}
      <header data-stuck={stuck ? "" : undefined} className={barVariants({ variant })}>
        {header}
      </header>
    </>
  );
}
