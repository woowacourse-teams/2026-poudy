"use client";

import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { FilterToggleChip } from "@poudy/design-system/filter-chip";
import { Icon } from "@poudy/design-system/icon";
import { SwitchIndicator } from "@poudy/design-system/switch";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import { type MyFilterStatus, myFilterApplied, useLastMyFilterStatus } from "@/lib/hooks/useMyFilterStatus";
import { rememberLoginReturn } from "@/lib/storage/login-return";
import { writeMyFilterOn } from "@/lib/storage/my-filter-setting";

const LABEL = "나만의 필터";
const SHELF = "/shelf";

type Prompt = "login" | "empty";

const PROMPTS = {
  login: {
    title: "로그인하고 나만의 필터를 쓸까요?",
    description: "나만의 필터는 로그인하면 쓸 수 있어요. 선반에서 안 맞은 제품의 성분을 모아 검색 결과에서 빼 드려요.",
    confirmLabel: "로그인",
  },
  empty: {
    title: "나만의 필터에 넣은 성분이 하나도 없어요",
    description: "선반에서 '안 맞았어요'로 평가하면 함께 든 성분을 찾아 나만의 필터에 넣을 수 있어요.",
    confirmLabel: "선반 보기",
  },
} as const satisfies Record<
  Prompt,
  { readonly title: string; readonly description: string; readonly confirmLabel: string }
>;

/**
 * 로그인한 뒤에는 나만의 필터를 켠 채로 이 화면에 돌아온다(명세 APP · 나만의 필터 토글 행 · 로그인 전).
 * 쓰려고 누른 것이므로 꺼 둔 설정이어도 켬으로 남긴다.
 */
const rememberReturnWithMyFilter = () => {
  writeMyFilterOn(true);
  rememberLoginReturn();
};

/** 켜지 못하는 상태에서 누르면 띄우는 확인 시트. 로그인 전이면 로그인으로, 필터가 비었으면 선반으로 보낸다. */
const useMyFilterPrompt = () => {
  const router = useRouter();
  const [prompt, setPrompt] = useState<Prompt>();
  const shown = PROMPTS[prompt ?? "login"];

  const confirm = () => {
    setPrompt(undefined);
    if (prompt === "login") {
      rememberReturnWithMyFilter();
      router.push("/login");
      return;
    }
    router.push(SHELF);
  };

  const sheet = (
    <ConfirmSheet
      open={prompt !== undefined}
      title={shown.title}
      description={shown.description}
      confirmLabel={shown.confirmLabel}
      onConfirm={confirm}
      onCancel={() => setPrompt(undefined)}
    />
  );

  return { ask: setPrompt, sheet };
};

type MyFilterToggleProps = {
  /** 설정(쿠키)의 켬 여부. 로그인 전이거나 필터가 비었으면 적용할 것이 없으므로 끈 모양으로 그린다. */
  readonly on: boolean;
  readonly status: MyFilterStatus;
  readonly onChange: (on: boolean) => void;
};

/**
 * S23 필터 칩 줄의 나만의 필터 칩(명세 APP · 필터 토글 칩). 로그인 여부와 상관없이 보여 주고, 켤 수 없는 상태면 확인 시트로 안내한다.
 * - 로그인 전: 로그인 안내 시트. 로그인하면 켠 채로 돌아온다.
 * - 필터가 비어 있음: 켜도 결과가 바뀌지 않으므로 켜지 않고, 성분을 찾는 선반으로 안내한다.
 * - 성분이 있음: 바로 켜고 끈다.
 * 관리자 세션이거나 필터를 읽지 못하면 숨긴다.
 * 읽는 동안에는 서버 컴포넌트가 정한 적용 여부(serverApplied)로 그려, 켠 채 들어온 회원에게 칩이 깜빡이지 않게 한다.
 */
export function MyFilterChip({
  on,
  status,
  onChange,
  serverApplied,
}: MyFilterToggleProps & { readonly serverApplied: boolean }) {
  const { ask, sheet } = useMyFilterPrompt();
  if (status.status === "unavailable") return null;

  const applied = myFilterApplied(on, status);

  const press = () => {
    if (status.status === "loading") return;
    if (status.status === "signedOut") return ask("login");
    if (status.count === 0) return ask("empty");
    onChange(!applied);
  };

  return (
    <>
      <FilterToggleChip
        label={LABEL}
        icon="user-check"
        pressed={status.status === "loading" ? serverApplied : applied}
        onPress={press}
      />
      {sheet}
    </>
  );
}

type RowContentProps = {
  readonly on?: boolean;
  readonly title: string;
  readonly description: string;
  readonly trailing: ReactNode;
};

/** 행의 안쪽(아이콘 · 제목과 설명 · 끝 요소). 무엇을 누르는지는 감싸는 쪽이 정한다. */
function RowContent({ on = false, title, description, trailing }: RowContentProps) {
  return (
    <>
      <Icon name="user-check" size={20} scalable className={on ? "text-brand-text" : "text-text-secondary"} />
      {/* 글자가 커져 글 칸이 최소 폭(112px)보다 좁아지면 끝 요소를 다음 줄 끝으로 내린다. 320 화면의 기본 배율에서는 한 줄에 들어가는 폭이다. */}
      <span className="flex min-w-28 flex-1 flex-col gap-0.5">
        <span className="text-body leading-snug font-semibold text-text-primary">{title}</span>
        <span className="text-body-sm leading-snug text-text-secondary">{description}</span>
      </span>
      {trailing}
    </>
  );
}

// 켠 행에만 테두리가 있다. 다른 상태도 같은 두께의 투명 테두리를 두어 상태가 바뀌어도 행 높이가 같다.
const ROW = "flex w-full flex-wrap items-center justify-end gap-3 rounded-xl border px-4 py-3 text-left";

/** 스위치 대신 두는 행동(명세 BTN · Ghost). 행은 회색 면이라 한 단계 진한 면(fb-border)으로 hover·눌림을 그린다. */
function RowAction({ children, onClick }: { readonly children: string; readonly onClick: () => void }) {
  return (
    <Button variant="ghost-on-surface" trailingIcon={<Icon name="chevron-right" size={14} />} onClick={onClick}>
      {children}
    </Button>
  );
}

/**
 * S22 성분 탭의 나만의 필터 행(명세 APP · 나만의 필터 토글 행).
 * - 로그인 전: [로그인 ›]. 누르면 로그인 안내 시트를 띄운다. 성분 탐색이 나만의 필터를 처음 알게 되는 자리라 숨기지 않는다.
 * - 필터가 비어 있음: [선반 보기 ›]. 켤 것이 없어 바로 선반으로 보낸다.
 * - 성분이 있음: 스위치. 설명은 켜고 꺼도 같은 문장이라 줄이 흔들리지 않는다. 상태는 스위치와 면 색이 알린다.
 * 관리자 세션이거나 필터를 읽지 못하면 숨긴다.
 *
 * 회원 상태를 읽는 동안에는 이 기기에서 마지막으로 읽은 상태의 모양으로 그리고, 누름은 읽은 뒤부터 받는다.
 * 처음 온 기기는 로그인 전 모양이다. 정적 페이지라 서버가 회원 상태를 모르므로, 읽은 뒤 모양이 바뀌는 일을 이렇게 줄인다.
 *
 * 행 면에는 hover·눌림을 그리지 않는다(명세 2026-10-23 결정). 로그인 전·비어 있음은 안의 Ghost 버튼만 누르고,
 * 스위치 행은 행 전체를 눌러 켜고 끄되 hover·눌림은 스위치 트랙과 손잡이만 바뀐다(SwitchIndicator).
 */
export function MyFilterToggleRow({ on: setting, status, onChange }: MyFilterToggleProps) {
  const router = useRouter();
  const { ask, sheet } = useMyFilterPrompt();
  // 스크롤 화면 안의 행이라, 밀다가 스친 손가락에 손잡이가 늘어나지 않게 눌림을 조금 늦게 그린다(STATE S09).
  const { pressableProps } = usePressable({ delayMs: 80 });
  const lastStatus = useLastMyFilterStatus();

  const loading = status.status === "loading";
  // 막힌 모양(전체를 흐리게)으로 그리면 읽는 짧은 사이에 행이 깜빡여서 모양은 그대로 두고 누름만 막는다.
  const whenLoaded = (action: () => void) => () => {
    if (!loading) action();
  };
  let shown = status;
  if (loading) shown = lastStatus;

  if (shown.status === "unavailable" || shown.status === "loading") return null;

  if (shown.status === "signedOut") {
    return (
      <div className={cn(ROW, "border-transparent bg-surface")} aria-busy={loading || undefined}>
        <RowContent
          title={LABEL}
          description="안 맞는 성분이 든 제품을 제외해요"
          trailing={<RowAction onClick={whenLoaded(() => ask("login"))}>로그인</RowAction>}
        />
        {sheet}
      </div>
    );
  }

  if (shown.count === 0) {
    return (
      <div className={cn(ROW, "border-transparent bg-surface")} aria-busy={loading || undefined}>
        <RowContent
          title={LABEL}
          description="아직 넣은 성분이 없어요"
          trailing={<RowAction onClick={whenLoaded(() => router.push(SHELF))}>선반 보기</RowAction>}
        />
      </div>
    );
  }

  const on = myFilterApplied(setting, shown);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-busy={loading || undefined}
      {...pressableProps}
      onClick={whenLoaded(() => onChange(!on))}
      className={cn(
        ROW,
        "pressable select-none",
        on ? "border-brand-border bg-brand-soft" : "border-transparent bg-surface",
      )}
    >
      <RowContent
        on={on}
        title="나만의 필터 적용"
        description={`필터에 넣은 성분 ${shown.count}개가 든 제품을 제외해요`}
        trailing={<SwitchIndicator checked={on} tone="brand" />}
      />
    </button>
  );
}
