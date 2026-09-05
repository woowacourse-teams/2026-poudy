"use client";

import Image from "next/image";
import { useState } from "react";

import { PRODUCT_PLACEHOLDER } from "@/components/ui/ProductThumbnail";

/**
 * 정정 대상 제품. 사용자가 바꿀 수 없으므로 누를 수 있게 보이지 않아야 한다.
 * 테두리나 화살표를 두지 않는다.
 */
export function TargetProduct({
  brandName,
  productName,
  imageUrl,
}: {
  readonly brandName: string;
  readonly productName: string;
  readonly imageUrl: string;
}) {
  const [failed, setFailed] = useState(false);

  /* 주소가 없거나 받아 오지 못하면 목록 카드와 같은 공병 그림으로 자리를 채운다. */
  const source = failed || !imageUrl ? PRODUCT_PLACEHOLDER : imageUrl;

  return (
    <section className="flex items-center gap-3 rounded-xl bg-surface-subtle p-3">
      {/* 제품 사진은 여백이 넓고 세로로 길다. 잘라내면 흰 부분만 남으므로 비율을 지켜 담는다. */}
      <span className="relative size-14 shrink-0">
        <Image
          // 주소가 바뀌면 이전 그림의 실패 상태를 가져가지 않는다.
          key={source}
          src={source}
          alt=""
          fill
          sizes="56px"
          className="object-contain"
          onError={() => setFailed(true)}
        />
      </span>

      {/*
        글자 크기와 색은 제품 목록 카드(ProductCard)와 맞춘다. 같은 제품을 가리키는
        이름이므로 화면이 달라도 같은 크기로 읽혀야 한다.
        브랜드와 제품명은 한 덩어리로 붙여 둔다.
      */}
      <span className="flex min-w-0 flex-col gap-2">
        <span className="mb-[-4px] truncate text-[12px] leading-tight font-medium text-text-secondary">
          {brandName}
        </span>
        {/* 제품명은 길어질 수 있어 두 줄까지 보여 주고 넘치면 줄임표로 끊는다. */}
        <span className="line-clamp-2 text-[14px] leading-tight text-text-primary">{productName}</span>
      </span>
    </section>
  );
}
