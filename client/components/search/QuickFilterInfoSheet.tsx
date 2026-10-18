"use client";

import { BottomSheet, BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

import type { KnownExcludeCodeResponse } from "@/lib/domain/exclude-codes";

/** 예시로 보여 줄 성분 수. 한 줄에 담기는 만큼이다. */
const EXAMPLES = 3;

type QuickFilterInfoSheetProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly quickFilters: readonly KnownExcludeCodeResponse[];
};

/**
 * 자주 피하는 성분 설명 시트(명세 S22b). 성분군마다 성분 수, 설명, 예시 성분을 보여 주고, 누르면 성분군 설명으로 간다.
 * 누구에게나 나쁜 성분이라는 뜻이 아니라는 것을 머리에서 먼저 말한다.
 */
export function QuickFilterInfoSheet({ open, onClose, quickFilters }: QuickFilterInfoSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheetHeader
        title="자주 피하는 성분이란?"
        description={
          <>
            피부 상태나 취향에 따라 빼고 보는 분들이 많은 성분군이에요.
            <br />
            누구에게나 나쁜 성분이라는 뜻은 아니에요.
          </>
        }
      />
      <BottomSheetBody>
        <ul className="flex flex-col divide-y divide-border">
          {quickFilters.map((code) => (
            <li key={code.code}>
              <QuickFilterRow code={code} />
            </li>
          ))}
        </ul>
      </BottomSheetBody>
      <BottomSheetFooter primary={{ label: "확인", onClick: onClose }} />
    </BottomSheet>
  );
}

function QuickFilterRow({ code }: { readonly code: KnownExcludeCodeResponse }) {
  const { pressableProps } = usePressable();
  const examples = code.ingredients.slice(0, EXAMPLES).map((ingredient) => ingredient.koreanName);

  return (
    <Link
      href={`/ingredient-groups/${encodeURIComponent(code.code)}`}
      {...pressableProps}
      className="pressable fb-surface flex items-center gap-3 py-4"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-section font-bold text-text-primary">{code.name}</span>
          <span className="flex h-6 items-center rounded-full bg-layer px-2 text-caption font-semibold text-text-secondary">
            {code.ingredients.length}종
          </span>
        </span>
        {code.description ? <span className="text-body text-text-body">{code.description}</span> : null}
        {examples.length > 0 ? (
          // 성분 이름 안(하이픈 등)에서 줄이 갈리지 않게 이름마다 묶고, 이름 사이에서만 줄을 바꾼다.
          <span className="text-caption text-text-secondary">
            예:{" "}
            {examples.map((example, index) => (
              <span key={example}>
                {index > 0 ? " · " : null}
                <span className="whitespace-nowrap">{example}</span>
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <Icon name="chevron-right" size={16} className="text-text-secondary" />
    </Link>
  );
}
