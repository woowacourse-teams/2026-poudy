"use client";

import type { SkinType } from "@poudy/api/api.zod";
import { usePressable } from "@poudy/design-system/use-pressable";
import Image from "next/image";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
import { track } from "@/lib/analytics/track";
import { SENSITIVE, SENSITIVE_OPTION, type SkinChoice } from "@/lib/domain/filter";
import { useDragScroll } from "@/lib/hooks/useDragScroll";
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
 * 인기 검색어 아래의 피부 타입 바로가기(명세 시안 H49xAq). 고른 타입을 조건으로 걸어 목록으로 보낸다.
 *
 * 시안은 기능 바로가기 셋(피부 타입 테스트, 유사템 찾기, 성분 사전)을 앞에 두지만, 도착 화면이 열리기 전까지는 두지 않는다.
 * 줄은 화면 끝에서 끝까지 깔리고 첫 칸과 마지막 칸만 거터만큼 안쪽에 둔다. 칸이 넘치면 가로로 밀고, 스크롤바를 숨겼으므로 마우스로 끌어서도 민다.
 * 칸의 폭은 기기 글자 크기를 키우면 글자를 따라 넓어진다.
 */
export function SkinTypeMenu({ items }: SkinTypeMenuProps) {
  const sectionRef = useHomeSectionView("skin_types", 3);
  const dragScroll = useDragScroll();
  if (items.length === 0) return null;

  return (
    <section ref={sectionRef} aria-label="피부 타입별 바로가기">
      <ul {...dragScroll} className="scrollbar-none flex scroll-px-gutter gap-2 overflow-x-auto px-gutter">
        {[...items, SENSITIVE_OPTION].map(({ code, name }) => (
          <li key={code} className="flex shrink-0">
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
      /* 포커스 링은 가로 스크롤 영역에 잘리지 않게 안쪽으로 그린다. hover 와 눌림은 칸 전체가 아니라 회색 타일의 면만 한 단계 진하게 한다(S03). */
      className="pressable flex min-w-14 flex-col items-center gap-1 whitespace-nowrap select-none focus-visible:-outline-offset-2"
    >
      <span className="flex size-12 items-center justify-center rounded-md bg-surface transition-colors duration-(--duration-fast) in-data-hovered:bg-hover-on-surface in-data-pressed:bg-hover-on-surface">
        {/*
          SVG 는 viewBox 를 그림에 맞춰 잘라 두어 상자가 곧 그림 크기다. 벡터라 최적화할 것이 없어 건너뛴다.
          아래 글자가 뜻을 전하므로 alt 를 비운다(A11Y D05).
        */}
        <Image
          src={TILE_IMAGES[code]}
          alt=""
          width={26}
          height={26}
          loading="eager"
          unoptimized
          draggable={false}
          className="size-6.5"
        />
      </span>
      <span className="text-caption text-text-body">{name}템</span>
    </Link>
  );
}
