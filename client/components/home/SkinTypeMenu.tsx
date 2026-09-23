"use client";

import Image from "next/image";
import Link from "next/link";

import { track } from "@/lib/analytics/track";
import type { SkinType } from "@/lib/domain/filter";
import { useHomeSectionView } from "@/lib/hooks/useHomeSectionView";

/**
 * 타일 그림은 서버가 주지 않는다. `/api/skin-types` 는 코드와 이름만 내려 주므로
 * 그림은 코드에 맞춰 여기에서 고른다. 빠른 필터도 같은 방식을 쓴다.
 */
const TILE_IMAGES: Record<SkinType, string> = {
  DRY: "/images/skin-types/dry.svg",
  OILY: "/images/skin-types/oily.svg",
  SENSITIVE: "/images/skin-types/sensitive.svg",
  COMBINATION: "/images/skin-types/combination.svg",
};

type SkinTypeMenuProps = {
  readonly items: readonly { readonly code: SkinType; readonly name: string }[];
};

/** 디자인 S01 의 피부 타입 빠른 메뉴. 고른 타입을 조건으로 걸어 목록으로 보낸다. */
export function SkinTypeMenu({ items }: SkinTypeMenuProps) {
  const sectionRef = useHomeSectionView("skin_types", 3);
  if (items.length === 0) return null;

  return (
    <section ref={sectionRef} className="flex flex-col gap-2.5">
      <h2 className="text-[17px] font-bold text-text-primary">피부 타입별로 찾아보세요</h2>

      {/*
        네 타입을 하나의 둥근 바에 담고 칸마다 세로선으로 가른다. 타입마다 네모를 두면
        네 덩어리로 읽혀 무엇을 고르는 자리인지 한 번에 들어오지 않는다. 한 줄로 묶으면
        고르는 자리가 하나로 보이고, 바가 본문 폭을 그대로 차지해 위아래 영역과 끝이 맞는다.

        모서리는 바로 위 인기 검색어 바와 같은 값을 쓴다. 폭과 테두리, 바탕이 같은 두 바가
        나란히 서 있어 모서리만 다르면 한 세트로 읽히지 않는다.
      */}
      <ul className="flex items-stretch overflow-hidden rounded-xl border border-border">
        {items.map(({ code, name }) => (
          /*
            칸은 고르게 나눈다. 이름의 길이가 달라도(`건성`·`민감성`) 칸이 들쭉날쭉하지
            않아야 한 줄로 읽힌다. 첫 칸을 뺀 나머지에만 왼쪽 선을 두어 양 끝에는
            선이 서지 않는다.
          */
          <li key={code} className="flex-1 border-l border-divider first:border-l-0">
            <Link
              href={`/products?skinType=${code}&from=skin_type`}
              onClick={() => track("skin_type_selected", { skin_type: code })}
              className="skin-type-segment flex items-center justify-center gap-1.5 py-3"
            >
              {/*
                높이는 그림과 위아래 여백이 정한다. 값을 박아 두면 글자나 그림 크기를
                바꿀 때마다 따로 맞춰야 하고, 남거나 모자란 자리가 생긴다.

                `viewBox` 를 그림에 맞춰 잘라 두어 상자가 곧 그림 크기다. 받은 파일은
                24 칸 안에 그림이 16 만 차지해, 상자를 키워도 그림은 그만큼 커지지 않았다.

                20px 은 글자(14px)보다 크지만 그 차이가 이름을 누르지 않는 선이다.

                SVG 는 `viewBox` 로 크기를 맞추므로 화면 밀도에 관계없이 또렷하다.
                벡터라 최적화할 것이 없어 건너뛴다. PNG 와 달리 캔버스에 빈자리가 없어
                글자와 붙으므로 사이를 따로 벌린다.
              */}
              <Image
                src={TILE_IMAGES[code]}
                alt=""
                width={24}
                height={24}
                loading="eager"
                unoptimized
                className="size-5 shrink-0"
              />
              {/*
                네 칸이 한 줄에 들어가야 한다. 이름이 가장 긴 `민감성`·`복합성` 이
                360px 화면에서도 접히지 않는 선까지 키운 크기다.
              */}
              <span className="text-[14px] leading-[1.2] font-semibold text-text-primary">{name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
