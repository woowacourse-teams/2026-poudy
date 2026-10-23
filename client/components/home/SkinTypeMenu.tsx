"use client";

import type { SkinType } from "@poudy/api/api.zod";
import { usePressable } from "@poudy/design-system/use-pressable";
import Image from "next/image";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
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
  if (code === SENSITIVE) return "/products?sensitiveSkin=true";
  return `/products?skinType=${code}`;
};

type SkinTypeMenuProps = {
  readonly items: readonly { readonly code: SkinType; readonly name: string }[];
};

/**
 * 피부 타입 빠른 메뉴(명세 S20). 고른 타입을 조건으로 걸어 목록으로 보낸다.
 *
 * 하나의 테두리 상자를 칸으로 고르게 나누고 칸 사이에 선을 긋는다. 360 미만에서는 2줄 2칸이다(A11Y D08).
 * 선은 상자 바탕(ui-border)을 칸 사이 1px 틈으로 드러내 그린다. 줄 수가 바뀌어도 가로선과 세로선이 함께 맞는다.
 *
 * 칸은 같은 기준 폭(80)으로 줄을 채우고 남는 폭을 나눠 가져, 기본 크기에서는 네 칸의 폭이 같다. 기기 글자 크기를 키워
 * 내용이 기준 폭보다 넓어지면 그 폭으로 줄을 다시 나누므로, 네 칸이 한 줄에 들어가지 않으면 넘치지 않고 다음 줄로 넘어간다. 마지막 줄의 칸은 남은 폭을 채워 빈 바탕이 드러나지 않는다.
 * 360 미만에서는 칸의 기준 폭을 1/3 로 두어(사이 선 때문에 셋이 들어가지 않는다) 한 줄에 두 칸씩 놓는다.
 */
export function SkinTypeMenu({ items }: SkinTypeMenuProps) {
  const sectionRef = useHomeSectionView("skin_types", 3);
  if (items.length === 0) return null;

  return (
    <section ref={sectionRef} aria-labelledby="home-skin-types" className="flex flex-col gap-3">
      <h2 id="home-skin-types" className="text-section font-bold text-text-primary">
        피부 타입별로 찾아보세요
      </h2>

      <ul className="flex flex-wrap gap-px overflow-hidden rounded-lg border border-border bg-border">
        {[...items, SENSITIVE_OPTION].map(({ code, name }) => (
          <li key={code} className="flex grow basis-1/3 bg-background min-[360px]:basis-20">
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
      entryPoint="skin_type"
      href={hrefOf(code)}
      {...pressableProps}
      onClick={() => track("skin_type_selected", { skin_type: code })}
      /* 포커스 링은 상자의 overflow-hidden 에 잘리지 않게 안쪽으로 그린다. */
      className="pressable fb-surface flex min-h-11 flex-1 items-center justify-center gap-2 px-2 py-3 whitespace-nowrap select-none focus-visible:-outline-offset-2"
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
