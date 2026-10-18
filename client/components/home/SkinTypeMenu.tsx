"use client";

import type { SkinType } from "@poudy/api/api.zod";
import { usePressable } from "@poudy/design-system/use-pressable";
import Image from "next/image";
import Link from "next/link";

import { track } from "@/lib/analytics/track";
import { SENSITIVE, SENSITIVE_OPTION, type SkinChoice } from "@/lib/domain/filter";
import { useHomeSectionView } from "@/lib/hooks/useHomeSectionView";

/**
 * 타일 그림은 서버가 주지 않는다. `/api/skin-types` 는 코드와 이름만 내려 주므로
 * 그림은 코드에 맞춰 여기에서 고른다. 빠른 필터도 같은 방식을 쓴다.
 */
const TILE_IMAGES: Record<SkinChoice, string> = {
  DRY: "/images/skin-types/dry.svg",
  OILY: "/images/skin-types/oily.svg",
  SENSITIVE: "/images/skin-types/sensitive.svg",
  COMBINATION: "/images/skin-types/combination.svg",
};

const hrefOf = (code: SkinChoice): string => {
  if (code === SENSITIVE) return "/products?sensitiveSkin=true&from=skin_type";
  return `/products?skinType=${code}&from=skin_type`;
};

type SkinTypeMenuProps = {
  readonly items: readonly { readonly code: SkinType; readonly name: string }[];
};

/**
 * 피부 타입 빠른 메뉴(명세 S20). 고른 타입을 조건으로 걸어 목록으로 보낸다.
 *
 * 하나의 테두리 상자를 칸으로 고르게 나누고 칸 사이에 선을 긋는다. 360 미만에서는 2줄 2칸이다(A11Y D08).
 * 선은 상자 바탕(ui-border)을 칸 사이 1px 틈으로 드러내 그린다. 줄 수가 바뀌어도 가로선과 세로선이 함께 맞는다.
 */
export function SkinTypeMenu({ items }: SkinTypeMenuProps) {
  const sectionRef = useHomeSectionView("skin_types", 3);
  if (items.length === 0) return null;

  return (
    <section ref={sectionRef} aria-labelledby="home-skin-types" className="flex flex-col gap-3">
      <h2 id="home-skin-types" className="text-section font-bold text-text-primary">
        피부 타입별로 찾아보세요
      </h2>

      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border min-[360px]:grid-cols-4">
        {[...items, SENSITIVE_OPTION].map(({ code, name }) => (
          <li key={code} className="flex bg-background">
            <SkinTypeLink code={code} name={name} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SkinTypeLink({ code, name }: { readonly code: SkinChoice; readonly name: string }) {
  const { pressableProps } = usePressable({ delayMs: 80 });

  return (
    <Link
      href={hrefOf(code)}
      {...pressableProps}
      onClick={() => track("skin_type_selected", { skin_type: code })}
      /* 포커스 링은 상자의 overflow-hidden 에 잘리지 않게 안쪽으로 그린다. */
      className="pressable fb-surface flex min-h-11 flex-1 items-center justify-center gap-2 px-1 py-3 select-none focus-visible:-outline-offset-2"
    >
      {/*
        SVG 는 viewBox 를 그림에 맞춰 잘라 두어 상자가 곧 그림 크기다. 벡터라 최적화할 것이 없어 건너뛴다.
        옆 글자가 뜻을 전하므로 alt 를 비운다(A11Y D05).
      */}
      <Image
        src={TILE_IMAGES[code]}
        alt=""
        width={24}
        height={24}
        loading="eager"
        unoptimized
        draggable={false}
        className="size-5 shrink-0"
      />
      <span className="text-body leading-snug font-semibold text-text-primary">{name}</span>
    </Link>
  );
}
