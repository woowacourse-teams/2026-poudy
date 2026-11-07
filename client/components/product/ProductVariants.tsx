"use client";

import type { ProductDetailResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@poudy/design-system/disclosure";
import { Icon } from "@poudy/design-system/icon";
import { useState } from "react";

import { formatPrice, formatUnitPrice, formatVolume, formatVolumeList } from "@/lib/domain/format";

type Variant = ProductDetailResponse["variants"][number];

function VariantRow({ variant }: { readonly variant: Variant }) {
  const perUnit = formatUnitPrice(variant.price, variant);

  return (
    <li className="flex min-h-12 items-center justify-between gap-3 py-1">
      <span className="text-13 leading-snug font-bold text-text-primary tabular-nums">{formatVolume(variant)}</span>
      <span className="flex flex-col items-end gap-0.5 text-caption leading-snug tabular-nums">
        <span className="font-medium text-text-body">정가 {formatPrice(variant.price)}</span>
        {perUnit === undefined ? null : <span className="text-text-secondary">{perUnit}</span>}
      </span>
    </li>
  );
}

/**
 * 용량별 정가(시안 S24 A2). 첫 용량만 보이고 나머지는 용량 이름만 미리 보여 주다가, 누르면 펼쳐 `접기`로 바뀐다.
 * 용량이 하나면 버튼이 없다. 펼치고 접는 움직임은 MOTION M02 의 '펼치기 · 접기'를 따른다.
 *
 * 화면 폭을 다 쓰면 용량과 가격이 양끝으로 갈라져 한 줄로 읽히지 않아 본문의 2/3 쯤으로 줄인다.
 * 나눔선은 보이는 용량 사이에만 긋는다. 접혀 있으면 선이 없다. 정가·단가는 오른쪽 끝에 쌓이므로 숫자 폭을 고정해 끝선을 맞춘다(TYPO T08).
 */
export function ProductVariants({ variants }: { readonly variants: readonly Variant[] }) {
  const [open, setOpen] = useState(false);
  const [first, ...rest] = variants;

  if (!first) return null;

  const restLabel = formatVolumeList(rest);

  return (
    <section className="flex w-60 flex-col gap-1">
      <h3 className="sr-only">용량별 가격</h3>
      <Disclosure open={open} onOpenChange={setOpen}>
        <div className="flex flex-col">
          <ul>
            <VariantRow variant={first} />
          </ul>
          {rest.length > 0 ? (
            <DisclosureContent className="border-t border-border">
              <ul className="divide-y divide-border">
                {rest.map((variant) => (
                  <VariantRow key={variant.id} variant={variant} />
                ))}
              </ul>
            </DisclosureContent>
          ) : null}
        </div>
        {rest.length > 0 ? (
          <div className="flex min-h-11 items-center justify-center">
            <DisclosureTrigger>
              {/* 평소에는 면이 없고 hover 에만 글자를 감싸는 면이 보인다. 보이는 높이는 36 이고 누르는 영역을 44 로 넓힌다. */}
              <button
                type="button"
                aria-label={open ? "나머지 용량 접기" : `나머지 용량 ${restLabel} 펼치기`}
                className="fb-surface flex min-h-9 max-w-full items-center justify-center gap-0.5 rounded-md px-3 py-1 text-center text-13 leading-snug text-text-secondary after:absolute after:-inset-y-1 after:inset-x-0"
              >
                <span className={cn("min-w-0 tabular-nums", open ? "font-semibold" : "font-medium")}>
                  {open ? "접기" : restLabel}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex shrink-0 transition-transform duration-(--duration-fast) ease-(--ease-out) motion-reduce:transition-none",
                    open && "rotate-180",
                  )}
                >
                  <Icon name="chevron-down" size={16} scalable />
                </span>
              </button>
            </DisclosureTrigger>
          </div>
        ) : null}
      </Disclosure>
    </section>
  );
}
