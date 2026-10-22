"use client";

import type { ProductDetailResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { CautionStatusIcon } from "@/components/ingredient/CautionStatusIcon";
import type { ProductEntryPoint } from "@/lib/analytics/events";
import { formatCount } from "@/lib/domain/format";
import { partHref, partOrder } from "@/lib/domain/product-parts";

type Part = ProductDetailResponse["productParts"][number];

/**
 * 탭 줄 오른쪽 끝의 [전체 보기 ⌄](S39c-1). 탭이 넘칠 때만 둔다. 누르는 영역은 44×48 이다.
 */
export function PartChipsToggle({
  ref,
  controls,
  open,
  onOpen,
}: {
  readonly ref: React.Ref<HTMLButtonElement>;
  readonly controls: string;
  readonly open: boolean;
  readonly onOpen: () => void;
}) {
  const { pressableProps } = usePressable();

  return (
    <button
      ref={ref}
      type="button"
      aria-label="구성품 전체 보기"
      aria-expanded={open}
      aria-controls={controls}
      {...pressableProps}
      onClick={onOpen}
      className="pressable fb-surface flex h-12 w-11 shrink-0 items-center justify-center text-text-secondary"
    >
      <Icon name="chevron-down" size={20} />
    </button>
  );
}

/** 마지막 칩이 보이는지. 보이면 '더 있음' 페이드를 걷는다. 목록을 기준으로 한 IntersectionObserver 로 안다. */
const useEndVisible = () => {
  const [visible, setVisible] = useState(true);

  const watch = useCallback((end: HTMLLIElement | null) => {
    const list = end?.parentElement;
    if (!end || !list || typeof IntersectionObserver === "undefined") return undefined;
    // 마지막 칩이 다 보여야 끝이 보인 것이다. 반올림으로 1 에 조금 못 미치는 경우를 함께 받는다.
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.intersectionRatio >= 0.99), {
      root: list,
      threshold: [0.99, 1],
    });
    observer.observe(end);
    return () => observer.disconnect();
  }, []);

  return { visible, watch };
};

function PartChip({
  part,
  order,
  selected,
  href,
  onSelect,
}: {
  readonly part: Part;
  readonly order: string;
  readonly selected: boolean;
  readonly href: string;
  readonly onSelect: () => void;
}) {
  const { pressableProps } = usePressable();
  const caution = part.cautionCount > 0;
  // 펼치면 고른 칩에 포커스를 둔다. 붙을 때 한 번만 부른다.
  const focusSelected = useCallback(
    (chip: HTMLAnchorElement | null) => {
      if (selected) chip?.focus({ preventScroll: true });
    },
    [selected],
  );

  return (
    <Link
      ref={focusSelected}
      href={href}
      replace
      scroll={false}
      prefetch={false}
      aria-current={selected ? "true" : undefined}
      {...pressableProps}
      onClick={onSelect}
      /*
       * 고른 칩은 테두리 색을 바꾸고 안쪽 고리를 하나 더 그어 굵게 보인다. 테두리 굵기나 글자 굵기를 바꾸면
       * 칩 폭이 달라져 흐름이 밀린다(S39c-8).
       */
      className={cn(
        "pressable fb-surface flex min-h-9 items-center gap-1 rounded-full border bg-background px-3",
        selected ? "border-text-primary inset-ring inset-ring-text-primary" : "border-border-strong",
      )}
    >
      <span className="text-caption leading-snug font-semibold text-text-secondary">{order}</span>{" "}
      <span className="flex items-center gap-0.5">
        <span className="text-body leading-snug font-semibold text-text-primary">{part.name ?? `구성품 ${order}`}</span>
        <CautionStatusIcon caution={caution} size={14} />
      </span>
      <span className="sr-only">, 주의 성분 {caution ? "있음" : "없음"}</span>
    </Link>
  );
}

/**
 * 구성품 칩 흐름(S39c-5·S39c-8). 탭 줄 자리에 겹쳐 펼치고, 머리줄에 '구성품 N개 · 주의 M개'를 둔다.
 *
 * - 칩은 순서 + 이름 + 주의 상태 아이콘이다. 최대 5줄(212)까지 보이고 그 안에서 스크롤하며, 더 있으면 아래를 흐린다.
 * - 고르지 않고 닫으면(접기, Esc, 바깥 누르기) 아무것도 바꾸지 않는다(S39c-8a).
 * - 고르면 주소의 partId 를 바꾸고 닫는다. 고른 탭을 보이게 밀고 패널로 올리는 일은 PartTabs 가 맡는다(S39c-8b).
 * - 떠 있는 면(그림자 1단계, 겹침 층 popover)이지만 딤은 두지 않는다.
 * - 펼칠 때는 자리를 옮기지 않고 옅게 나타난다(fast · ease-out, @starting-style).
 *   닫을 때는 바로 걷는다. 고른 뒤 패널로 올라가는 스크롤과 겹치지 않게 한다.
 */
export function PartChips({
  id,
  product,
  entryPoint,
  onClose,
  onSelect,
}: {
  readonly id: string;
  readonly product: ProductDetailResponse;
  readonly entryPoint: ProductEntryPoint;
  readonly onClose: () => void;
  readonly onSelect: (partId: number) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { visible: endVisible, watch: watchEnd } = useEndVisible();
  const { pressableProps } = usePressable();
  const parts = product.productParts;
  const cautionParts = parts.filter((part) => part.cautionCount > 0).length;

  // 바깥을 누르면 닫는다. 문서 전체의 누름은 React 트리 밖의 일이라 열려 있는 동안만 듣는다.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      onCloseRef.current();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div
      ref={panelRef}
      id={id}
      role="group"
      aria-label="구성품 목록"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onClose();
      }}
      className="absolute inset-x-0 top-0 z-(--z-popover) flex origin-top flex-col gap-2 rounded-b-lg bg-background pb-5 shadow-(--shadow-raised) transition duration-(--duration-fast) ease-(--ease-out) starting:opacity-0"
    >
      <div className="flex min-h-12 items-center justify-between gap-2 pl-(--gutter)">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-body leading-snug font-bold text-text-primary">구성품 {formatCount(parts.length)}</span>
          {cautionParts > 0 ? (
            <span className="flex items-center gap-0.5 text-caption leading-snug font-semibold text-warning-text">
              <CautionStatusIcon caution size={14} />
              주의 {formatCount(cautionParts)}
            </span>
          ) : null}
        </p>
        <button
          type="button"
          aria-label="구성품 목록 접기"
          aria-expanded="true"
          aria-controls={id}
          {...pressableProps}
          onClick={onClose}
          className="pressable fb-surface flex h-12 w-11 shrink-0 items-center justify-center text-text-primary"
        >
          <Icon name="chevron-up" size={20} />
        </button>
      </div>

      <div className="relative">
        <ul className="flex max-h-53 flex-wrap gap-2 overflow-y-auto overscroll-contain px-gutter">
          {parts.map((part, index) => (
            <li key={part.id} ref={index === parts.length - 1 ? watchEnd : undefined}>
              <PartChip
                part={part}
                order={partOrder(index)}
                selected={part.id === product.selectedPart?.id}
                href={partHref(product.id, part.id, entryPoint)}
                onSelect={() => onSelect(part.id)}
              />
            </li>
          ))}
        </ul>
        <div
          aria-hidden="true"
          data-hidden={endVisible ? "" : undefined}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-background transition-opacity duration-(--duration-fast) data-hidden:opacity-0"
        />
      </div>
    </div>
  );
}
