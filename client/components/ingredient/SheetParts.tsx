"use client";

import type { FormulationRoleResponse, SkinEffectResponse } from "@poudy/api/api.zod";
import { Badge } from "@poudy/design-system/badge";
import type { SheetCloseReason } from "@poudy/design-system/bottom-sheet";
import { Skeleton } from "@poudy/design-system/skeleton";
import { Tag } from "@poudy/design-system/tag";
import { usePressable } from "@poudy/design-system/use-pressable";

import { EffectIcon, effectLabel } from "./EffectTag";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
import type { SheetCloseMethod } from "@/lib/analytics/events";
import type { SheetDescription } from "@/lib/hooks/useSheetDescription";

/** 패키지 시트가 알려 주는 닫은 까닭을 분석의 닫은 방법으로 옮긴다. 머리의 ✕ 는 close 로 온다. */
export const closeMethodOf = (reason: SheetCloseReason): SheetCloseMethod =>
  reason === "close" ? "close_button" : reason;

/** 시트 머리의 피부 작용 태그(S24a·S24b). BottomSheetHeader 의 meta 로 넘긴다. 작용이 없으면 그리지 않는다. */
export function EffectTags({ effects }: { readonly effects: readonly Pick<SkinEffectResponse, "code" | "name">[] }) {
  if (effects.length === 0) return null;

  return (
    <ul aria-label="피부 작용" className="flex flex-wrap items-center gap-2">
      {effects.map((effect) => (
        <li key={effect.code}>
          <Tag variant="label" tone="neutral" icon={<EffectIcon code={effect.code} size={14} />}>
            {effectLabel(effect)}
          </Tag>
        </li>
      ))}
    </ul>
  );
}

/** `무슨 역할을 하나요?` 머리와 설명. 설명은 시트를 연 뒤에 받아 온다. */
export function RoleDescription({
  description,
  children,
}: {
  readonly description: SheetDescription<string>;
  readonly children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h3 className="text-section leading-snug font-bold text-text-primary">무슨 역할을 하나요?</h3>
        <Badge variant="ai" />
      </div>

      <DescriptionText description={description} />
      {children}
    </section>
  );
}

function DescriptionText({ description }: { readonly description: SheetDescription<string> }) {
  if (description.status === "loaded") {
    // 회색 막대가 글자로 순간 바뀌지 않게 옅게 들어온다. 자리를 옮기지 않으니 움직임 줄이기에서도 남긴다.
    return (
      <p className="text-body leading-relaxed text-pretty text-text-body transition-opacity duration-(--duration-base) ease-(--ease-out) starting:opacity-0">
        {description.value}
      </p>
    );
  }
  if (description.status === "failed") {
    return <p className="text-body leading-relaxed text-text-secondary">설명을 불러오지 못했어요.</p>;
  }

  // 설명 두 줄 높이를 미리 잡아 두어 받아 온 뒤에 아래가 밀려나지 않게 한다.
  return (
    <div aria-busy="true" aria-label="설명을 불러오는 중" className="flex flex-col gap-2 py-1">
      <Skeleton shape="line" size={14} className="w-full" />
      <Skeleton shape="line" size={14} className="w-3/5" />
    </div>
  );
}

/** 성분의 배합 목적(S24b). 회색 면 26 · 좌우 12 의 알약으로 늘어놓는다. 없으면 그리지 않는다. */
export function FormulationRoles({ roles }: { readonly roles: readonly FormulationRoleResponse[] }) {
  if (roles.length === 0) return null;

  return (
    <ul aria-label="배합 목적" className="flex flex-wrap items-center gap-2">
      {roles.map((role) => (
        <li
          key={role.id}
          className="flex h-6.5 items-center rounded-full bg-surface px-3 text-label leading-snug font-semibold text-text-body"
        >
          {role.name}
        </li>
      ))}
    </ul>
  );
}

/** 시트 본문의 자리. 머리 아래 20 을 띄우고 묶음 사이는 24 다(S24a · S24b 시트 내용). */
export const SHEET_CONTENT = "flex flex-col gap-6 pt-5 pb-2";

/**
 * 시트 맨 아래의 이동 링크. 시트에 담지 못한 설명은 상세 화면에서 본다. 본문이 스크롤되어도 늘 보이게 발에 둔다.
 * 다른 화면으로 가는 링크라 BottomSheetFooter 의 버튼 대신 같은 자리·모양(보조 버튼 48)의 링크로 그린다.
 */
export function SheetDetailLink({
  href,
  entryPoint,
  onClick,
  children,
}: {
  readonly href: string;
  readonly entryPoint?: string;
  /** 시트를 떠나 설명 화면으로 옮겨 간다는 것을 시트를 연 쪽에 알린다. */
  readonly onClick?: () => void;
  readonly children: React.ReactNode;
}) {
  const { pressableProps } = usePressable();

  return (
    <div className="flex shrink-0 px-5 pt-4 pb-safe">
      <Link
        href={href}
        entryPoint={entryPoint}
        {...pressableProps}
        onClick={onClick}
        className="pressable press-scale fb-secondary flex h-12 w-full min-w-0 items-center justify-center rounded-xl bg-button-secondary px-4 text-14 leading-none font-semibold text-text-primary"
      >
        <span className="truncate">{children}</span>
      </Link>
    </div>
  );
}
