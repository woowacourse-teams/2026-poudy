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
  DRY: "/images/skin-types/dry.png",
  OILY: "/images/skin-types/oily.png",
  SENSITIVE: "/images/skin-types/sensitive.png",
  COMBINATION: "/images/skin-types/combination.png",
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

      <ul className="flex gap-2">
        {items.map(({ code, name }) => (
          <li key={code} className="flex-1">
            <Link
              href={`/products?skinType=${code}&from=skin_type`}
              onClick={() => track("skin_type_selected", { skin_type: code })}
              className="skin-type-link flex flex-col items-center gap-2"
            >
              {/*
                디자인(S01)의 타일은 72px 테두리 안에 64px 그림을 담는다. 테두리는 그대로 두고
                안쪽 바탕만 비워, 아이콘이 네모 위에 얹힌 것처럼 보이지 않게 한다.
              */}
              <span className="skin-type-tile flex size-18 items-center justify-center rounded-2xl border border-border">
                {/*
                  최적화를 건너뛴다. 색이 몇 가지뿐인 그림이라 최적화가 팔레트 PNG 로 줄이면서
                  투명한 자리를 배경색으로 채워 넣어, 아이콘 뒤에 네모가 생긴다.

                  대신 파일을 3배 크기인 216px 로 미리 줄여 두었다. 64px 로 그리므로
                  3배 화면까지 또렷하고, 최적화를 건너뛰어도 내려받는 양이 크지 않다.
                */}
                <Image
                  src={TILE_IMAGES[code]}
                  alt=""
                  width={216}
                  height={216}
                  loading="eager"
                  unoptimized
                  className="size-16"
                />
              </span>
              {/* 디자인의 줄 높이는 글자 크기의 1.2 배다. */}
              <span className="text-[13px] leading-[1.2] font-semibold text-text-primary">{name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
