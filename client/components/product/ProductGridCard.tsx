"use client";

import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import type { ReactNode } from "react";

import { ProductImage } from "@/components/ui/ProductImage";
import type { ProductEntryPoint } from "@/lib/analytics/events";
import { HOME_CARD_MAX, HOME_CARD_SIZES } from "@/lib/layout-tokens";

type ProductGridProps = {
  /** `ProductGridCard` 를 담은 li 들 */
  readonly children: ReactNode;
};

/**
 * 홈 제품 카드 격자(명세 A11Y D08 · IMAGE P06). 열 사이 8, 행 사이 16 이다.
 * 거터가 12 로 좁아지는 360 미만에서는 2열, 그 이상은 3열이다. 사진의 sizes(HOME_CARD_SIZES)도 같은 값으로 셈한다.
 */
export function ProductGrid({ children }: ProductGridProps) {
  return <ul className="grid grid-cols-2 gap-x-2 gap-y-4 min-[360px]:grid-cols-3">{children}</ul>;
}

type ProductGridCardProps = {
  readonly id: number;
  readonly name: string;
  readonly brandName: string;
  readonly imageUrl: string;
  /** 어느 화면에서 제품으로 들어갔는지. 제품 상세가 주소의 from 에서 읽는다. */
  readonly from: ProductEntryPoint;
  /** 카드 선택을 수집해야 하는 화면에서만 전달한다. */
  readonly onClick?: () => void;
  /**
   * 첫 화면에 바로 보이는 자리인지. 보이는 자리는 미루지 않고 곧바로 받는다.
   *
   * 자리마다 다르므로 컴포넌트가 스스로 정하지 않고 목록이 정해 준다.
   */
  readonly loading?: "eager" | "lazy";
};

/**
 * 홈 제품 카드(명세 APP · 홈 제품 카드 nLmj5). 홈의 사람들이 보는 제품과 큐레이션 상세가 함께 쓴다.
 *
 * 카드 폭을 채우는 정사각 칸에 사진을 두고, 그 아래에 브랜드와 제품명을 이어 두 줄까지 적는다. 저장 버튼은 두지 않는다.
 * 명세는 사진이 칸을 채우지만, 3열에서 사진이 글자보다 너무 커 보여 칸은 그대로 두고 사진만 칸 폭의 60% 로 줄여 가운데에
 * 둔다(10/22 결정). 줄어든 만큼은 칸 안의 여백이 되어 카드의 높이와 글자 자리는 바뀌지 않는다.
 *
 * hover 와 눌림은 제품명 밑줄 하나다(STATE S08 · S11 fb-underline). 사진은 흰 타일 위 누끼라 덮개를 깔면 회색 사각형이
 * 생기고, 격자 칸은 행처럼 폭 전체에 면을 깔 수 없다. 카드 크기와 자리는 바꾸지 않는다.
 */
export function ProductGridCard({
  id,
  name,
  brandName,
  imageUrl,
  from,
  onClick,
  loading = "lazy",
}: ProductGridCardProps) {
  const { pressableProps } = usePressable({ delayMs: 80 });

  return (
    <Link
      href={`/products/${id}?from=${from}`}
      onClick={onClick}
      {...pressableProps}
      className="pressable fb-underline flex flex-col gap-1 rounded-xs select-none"
    >
      {/* 사진은 칸 폭의 60% 정사각에 contain 으로 담고 반경을 주지 않는다(명세 IMAGE P01 · P02). */}
      <span className="flex aspect-square w-full items-center justify-center">
        <ProductImage
          src={imageUrl}
          size={HOME_CARD_MAX}
          sizes={HOME_CARD_SIZES}
          loading={loading}
          className="aspect-square h-auto w-3/5"
        />
      </span>

      {/*
        브랜드와 제품명을 한 덩어리로 이어 두 줄까지 보여 주고, 넘치면 줄임표로 끊는다.
        사이트 전체의 낱말 단위 줄바꿈(keep-all)을 따른다. 명세 nLmj5 도 낱말 사이에서 줄을 나눈다.
        글자 단위로 끊으면 기기 글자 크기를 키웠을 때 '인텐/시브'처럼 낱말 한가운데가 갈라진다.
      */}
      <span data-product-name="" className="line-clamp-2 text-body-sm text-text-primary">
        {brandName} {name}
      </span>
    </Link>
  );
}
